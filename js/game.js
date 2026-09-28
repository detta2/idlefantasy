// ============================================================
// IDLE FANTASY — state, game loop, battle, save/load
// Tick 100ms. Tanpa dependensi selain data.js.
// Memanggil UI.* (didefinisikan di ui.js) untuk tampilan.
// ============================================================
var SAVE_KEY = 'idlefantasy_save_v1';
var OFFLINE_CAP = 8 * 3600; // 8 jam, detik

var Game = {
  state: null,
  battleT: 0,
  saveT: 0,

  // ---------- state ----------
  newState: function () {
    return {
      v: 1,
      skills: {
        meditasi:   { lvl: 1, xp: 0 },
        herba:      { lvl: 1, xp: 0 },
        kristal:    { lvl: 1, xp: 0 },
        alkimia:    { lvl: 1, xp: 0 },
        enchanting: { lvl: 1, xp: 0 },
      },
      tempur: { lvl: 1, xp: 0 },
      hp: 62,
      gold: 0,
      res: { mana: 0, herba: 0, kristal: 0, ramuan: 0 },
      equip: { senjata: null, perisai: null, helm: null, armor: null, sepatu: null, cincin: null },
      inv: [],
      nextItemId: 1,
      zone: 'hutan',
      action: null,   // { skill: 'meditasi', t: detik }
      battle: null,   // { mi: index monster, hp: sisa hp monster }
      autoEat: true,
      savedAt: Date.now(),
    };
  },

  // ---------- derived stats ----------
  gearStat: function (key) {
    var total = 0, eq = this.state.equip;
    Object.keys(eq).forEach(function (slot) {
      if (eq[slot]) total += itemStat(eq[slot], key);
    });
    return total;
  },
  maxHP: function () {
    return 50 + this.state.tempur.lvl * 12 + this.gearStat('hp');
  },
  atk: function () {
    return 5 + this.state.tempur.lvl * 2 + this.gearStat('atk');
  },
  def: function () {
    return this.gearStat('def');
  },

  // ---------- init / loop ----------
  init: function () {
    this.load();
    var summary = this.applyOffline();
    UI.renderAll();
    if (summary) UI.showWelcomeBack(summary);
    var self = this;
    setInterval(function () { self.tick(0.1); }, 100);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) self.save();
    });
    window.addEventListener('beforeunload', function () { self.save(); });
  },

  tick: function (dt) {
    var s = this.state;
    // aksi latih
    if (s.action) {
      s.action.t += dt;
      var cyc = cycleTime(s.action.skill, s.skills[s.action.skill].lvl);
      while (s.action && s.action.t >= cyc) {
        s.action.t -= cyc;
        this.doCycle(s.action.skill);
      }
    }
    // battle: ronde tiap 1.2 detik
    if (s.battle) {
      this.battleT += dt;
      while (s.battle && this.battleT >= 1.2) {
        this.battleT -= 1.2;
        this.battleRound();
      }
    } else {
      this.battleT = 0;
      // regen pelan saat tidak bertempur
      if (s.hp < this.maxHP()) {
        s.hp = Math.min(this.maxHP(), s.hp + this.maxHP() * 0.01 * dt);
      }
    }
    // autosave tiap 10 detik
    this.saveT += dt;
    if (this.saveT >= 10) {
      this.saveT = 0;
      this.save();
    }
    UI.tickUpdate();
  },

  // ---------- skilling ----------
  startSkill: function (id) {
    var s = this.state;
    if (s.battle) this.stopBattle();
    if (s.action && s.action.skill === id) {
      this.stopAction();
      return;
    }
    s.action = { skill: id, t: 0 };
    UI.refresh();
  },
  stopAction: function () {
    this.state.action = null;
    UI.refresh();
  },

  doCycle: function (skillId) {
    var s = this.state, def = skillDef(skillId);
    // cek bahan (alkimia)
    if (def.cost) {
      var kurang = Object.keys(def.cost).some(function (r) {
        return s.res[r] < def.cost[r];
      });
      if (kurang) {
        s.action = null;
        UI.toast('Bahan kurang! Kumpulin Herba & Mana dulu.');
        UI.refresh();
        return;
      }
      Object.keys(def.cost).forEach(function (r) { s.res[r] -= def.cost[r]; });
    }
    Object.keys(def.gain).forEach(function (r) { s.res[r] += def.gain[r]; });
    this.gainXp(skillId, def.xp);
    UI.spawnPopup('card-' + skillId, '+' + def.xp + ' XP');
  },

  // key: id skill atau 'tempur'
  gainXp: function (key, amt) {
    var s = this.state;
    var obj = key === 'tempur' ? s.tempur : s.skills[key];
    var nama = key === 'tempur' ? 'Tempur' : skillDef(key).name;
    obj.xp += amt;
    var naik = false;
    while (obj.xp >= xpButuh(obj.lvl)) {
      obj.xp -= xpButuh(obj.lvl);
      obj.lvl += 1;
      naik = true;
      UI.toast('🎉 ' + nama + ' naik ke level ' + obj.lvl + '!');
    }
    if (naik) {
      UI.refresh();
    }
  },

  // ---------- battle ----------
  currentMonster: function () {
    var s = this.state;
    if (!s.battle) return null;
    var z = zoneDef(s.zone);
    var m = z.monsters[s.battle.mi];
    var st = monsterStats(m.lvl);
    return { def: m, lvl: m.lvl, hp: s.battle.hp, maxhp: st.hp, atk: st.atk, xp: st.xp, gold: st.gold };
  },

  startBattle: function (mi) {
    var s = this.state;
    if (s.action) s.action = null;
    var z = zoneDef(s.zone);
    var m = z.monsters[mi];
    var st = monsterStats(m.lvl);
    s.battle = { mi: mi, hp: st.hp };
    s.hp = Math.min(s.hp, this.maxHP());
    UI.refresh();
  },
  stopBattle: function () {
    this.state.battle = null;
    this.battleT = 0;
    UI.refresh();
  },

  battleRound: function () {
    var s = this.state;
    var mon = this.currentMonster();
    if (!mon) return;
    // pemain menyerang
    var pdmg = Math.max(1, Math.round(this.atk() * rand(0.85, 1.15)));
    mon.hp -= pdmg;
    s.battle.hp = mon.hp;
    if (mon.hp <= 0) {
      this.winBattle(mon);
      return;
    }
    // monster menyerang balik
    var mdmg = Math.max(1, Math.round(mon.atk * rand(0.85, 1.15) - this.def()));
    s.hp -= mdmg;
    // makan otomatis: ramuan saat HP < 35%
    if (s.hp > 0 && s.hp < this.maxHP() * 0.35 && s.autoEat && s.res.ramuan > 0) {
      s.res.ramuan -= 1;
      s.hp = Math.min(this.maxHP(), s.hp + Math.round(this.maxHP() * 0.4));
      UI.toast('🧪 Minum ramuan! HP pulih.');
    }
    if (s.hp <= 0) {
      s.hp = this.maxHP();
      s.battle = null;
      this.battleT = 0;
      UI.toast('💀 Kamu tumbang! Istirahat dulu, HP udah pulih.');
      UI.refresh();
    }
  },

  winBattle: function (mon) {
    var s = this.state;
    this.gainXp('tempur', mon.xp);
    var gold = Math.round(mon.gold * rand(0.8, 1.2));
    s.gold += gold;
    UI.spawnPopup('ab-card', '+' + mon.xp + ' XP');
    // 15% drop equipment
    if (Math.random() < 0.15) {
      var item = genItem(mon.lvl);
      item.id = s.nextItemId++;
      s.inv.push(item);
      UI.toast('🎁 Dapat ' + itemFullName(item) + '!');
    }
    // monster respawn — auto lanjut biar idle
    var st = monsterStats(mon.lvl);
    s.battle.hp = st.hp;
  },

  toggleAutoEat: function () {
    this.state.autoEat = !this.state.autoEat;
    UI.refresh();
  },

  // ---------- equipment ----------
  findItem: function (id) {
    var s = this.state, found = null;
    s.inv.forEach(function (it) { if (it.id === id) found = { item: it, where: 'inv' }; });
    if (!found) Object.keys(s.equip).forEach(function (slot) {
      if (s.equip[slot] && s.equip[slot].id === id) found = { item: s.equip[slot], where: slot };
    });
    return found;
  },

  equipFromInv: function (id) {
    var s = this.state, f = this.findItem(id);
    if (!f || f.where !== 'inv') return;
    var item = f.item;
    s.inv = s.inv.filter(function (it) { return it.id !== id; });
    var lama = s.equip[item.slot];
    s.equip[item.slot] = item;
    if (lama) s.inv.push(lama);
    s.hp = Math.min(s.hp, this.maxHP());
    UI.toast('✅ ' + itemFullName(item) + ' dipakai.');
    UI.refresh();
  },

  unequip: function (slot) {
    var s = this.state;
    var item = s.equip[slot];
    if (!item) return;
    s.equip[slot] = null;
    s.inv.push(item);
    s.hp = Math.min(s.hp, this.maxHP());
    UI.refresh();
  },

  enchantItem: function (id) {
    var s = this.state, f = this.findItem(id);
    if (!f) return;
    var item = f.item;
    if (item.enchant >= 5) {
      UI.toast('Udah mentok +5 nih.');
      return;
    }
    var cost = enchantCost(item);
    if (s.res.kristal < cost.kristal || s.res.mana < cost.mana) {
      UI.toast('Kristal/Mana kurang! Butuh ' + cost.kristal + '💎 ' + cost.mana + '🔮.');
      return;
    }
    s.res.kristal -= cost.kristal;
    s.res.mana -= cost.mana;
    item.enchant += 1;
    this.gainXp('enchanting', 20);
    UI.toast('✨ ' + itemFullName(item) + '! Stat +8%.');
    UI.refresh();
  },

  // ---------- zona ----------
  setZone: function (id) {
    var s = this.state, z = zoneDef(id);
    if (s.tempur.lvl < z.minLvl) {
      UI.toast('🔒 Butuh Tempur lvl ' + z.minLvl + ' buat ke sini.');
      return;
    }
    if (s.battle) { s.battle = null; this.battleT = 0; }
    s.zone = id;
    UI.toast(z.icon + ' Pindah ke ' + z.name + '.');
    UI.refresh();
  },

  // ---------- save / load ----------
  save: function () {
    try {
      this.state.savedAt = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch (e) { /* storage penuh / privat: biarin */ }
  },

  load: function () {
    var fresh = this.newState();
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) { this.state = fresh; return; }
      var d = JSON.parse(raw);
      // merge aman per key
      Object.keys(fresh).forEach(function (k) {
        if (d[k] !== undefined) fresh[k] = d[k];
      });
      this.state = fresh;
    } catch (e) {
      this.state = fresh;
    }
    // jaga-jaga data rusak
    if (!zoneDef(this.state.zone)) this.state.zone = 'hutan';
    this.state.hp = Math.min(this.state.hp, this.maxHP());
  },

  // ---------- offline progress ----------
  applyOffline: function () {
    var s = this.state;
    var elapsed = Math.floor((Date.now() - (s.savedAt || Date.now())) / 1000);
    if (elapsed < 60 || !s.action) return null;
    elapsed = Math.min(elapsed, OFFLINE_CAP);
    var skillId = s.action.skill;
    var def = skillDef(skillId);
    if (!def.cycle) return null;
    var cyc = cycleTime(skillId, s.skills[skillId].lvl);
    var cycles = Math.floor(elapsed / cyc * 0.5); // 50% rate
    if (cycles <= 0) return null;
    // alkimia: batasi sesuai bahan yang ada
    if (def.cost) {
      var maxBy = Infinity;
      Object.keys(def.cost).forEach(function (r) {
        maxBy = Math.min(maxBy, Math.floor(s.res[r] / def.cost[r]));
      });
      cycles = Math.min(cycles, maxBy);
    }
    if (cycles <= 0) return null;

    var lines = [];
    var t0lvl = s.skills[skillId].lvl;
    // bahan
    if (def.cost) Object.keys(def.cost).forEach(function (r) { s.res[r] -= def.cost[r] * cycles; });
    // hasil
    var hasil = {};
    Object.keys(def.gain).forEach(function (r) {
      s.res[r] += def.gain[r] * cycles;
      hasil[r] = def.gain[r] * cycles;
    });
    // xp (tanpa toast spam; kumpulin info level)
    var obj = s.skills[skillId];
    obj.xp += def.xp * cycles;
    var naikKe = t0lvl;
    while (obj.xp >= xpButuh(obj.lvl)) {
      obj.xp -= xpButuh(obj.lvl);
      obj.lvl += 1;
      naikKe = obj.lvl;
    }
    s.action = null; // aksi berhenti saat offline berakhir
    s.hp = this.maxHP();

    lines.push('+' + (def.xp * cycles) + ' XP ' + def.name);
    Object.keys(hasil).forEach(function (r) {
      lines.push('+' + hasil[r] + ' ' + RES[r].icon + ' ' + RES[r].name);
    });
    if (naikKe > t0lvl) lines.push('🎉 ' + def.name + ' naik ke level ' + naikKe + '!');
    return { lines: lines, elapsed: elapsed };
  },
};
