// ============================================================
// IDLE FANTASY — tampilan (render 4 tab, top bar, action bar)
// Vanilla JS + innerHTML. Semua teks Indonesia santai.
// ============================================================
var UI = {
  tab: 'skill',
  toastTimer: null,

  // ---------- util ----------
  fmt: function (n) {
    n = Math.floor(n);
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return '' + n;
  },
  el: function (id) { return document.getElementById(id); },
  pct: function (a, b) { return b <= 0 ? 0 : Math.max(0, Math.min(100, a / b * 100)); },

  go: function (tab) {
    this.tab = tab;
    this.refresh();
  },

  // ---------- render utama ----------
  renderAll: function () {
    this.renderTopbar();
    this.renderActionBar();
    this.renderTab();
    this.renderNav();
  },
  refresh: function () { this.renderAll(); },

  // ---------- top bar ----------
  renderTopbar: function () {
    var s = Game.state;
    var html =
      '<div class="tb-brand">IDLE <span>FANTASY</span></div>' +
      '<div class="tb-hp"><div class="hp-bar"><div class="hp-fill" id="tb-hp-fill"></div></div>' +
      '<div class="hp-text" id="tb-hp-text"></div></div>' +
      '<div class="tb-cur">💰<span id="tb-gold">' + this.fmt(s.gold) + '</span></div>' +
      '<div class="tb-cur">🔮<span id="tb-mana">' + this.fmt(s.res.mana) + '</span></div>';
    this.el('topbar').innerHTML = html;
    this.updateTopbar();
  },
  updateTopbar: function () {
    var s = Game.state, max = Game.maxHP();
    var f = this.el('tb-hp-fill'), t = this.el('tb-hp-text');
    if (f) f.style.width = this.pct(s.hp, max) + '%';
    if (t) t.textContent = Math.ceil(s.hp) + ' / ' + max + ' HP';
    var g = this.el('tb-gold'); if (g) g.textContent = this.fmt(s.gold);
    var m = this.el('tb-mana'); if (m) m.textContent = this.fmt(s.res.mana);
  },

  // ---------- action bar ----------
  renderActionBar: function () {
    var s = Game.state, bar = this.el('actionbar');
    if (!s.action && !s.battle) { bar.classList.add('hidden'); bar.innerHTML = ''; return; }
    bar.classList.remove('hidden');
    var icon, name, sub;
    if (s.action) {
      var def = skillDef(s.action.skill);
      icon = def.icon; name = def.name; sub = 'Latihan jalan otomatis...';
    } else {
      var mon = Game.currentMonster();
      icon = mon.def.icon; name = '⚔️ ' + mon.def.name + (mon.def.boss ? ' 👑' : '');
      sub = 'HP musuh: <span id="ab-hptext"></span>';
    }
    bar.innerHTML =
      '<div class="ab-main" id="ab-card"><div class="popup-layer"></div>' +
      '<span class="ab-icon">' + icon + '</span>' +
      '<div class="ab-info"><div class="ab-name">' + name + '</div>' +
      '<div class="ab-bar"><div class="ab-fill" id="ab-fill"></div></div>' +
      '<div class="ab-sub">' + sub + '</div></div>' +
      '<button class="btn-stop" onclick="UI.stopActive()">Berhenti</button></div>';
  },
  stopActive: function () {
    if (Game.state.battle) Game.stopBattle();
    else Game.stopAction();
  },
  updateActionBar: function () {
    var s = Game.state;
    var fill = this.el('ab-fill');
    if (!fill) return;
    if (s.action) {
      var cyc = cycleTime(s.action.skill, s.skills[s.action.skill].lvl);
      fill.style.width = this.pct(s.action.t, cyc) + '%';
    } else if (s.battle) {
      var mon = Game.currentMonster();
      if (mon) {
        fill.style.width = this.pct(mon.hp, mon.maxhp) + '%';
        var ht = this.el('ab-hptext');
        if (ht) ht.textContent = Math.max(0, Math.ceil(mon.hp)) + ' / ' + mon.maxhp;
      }
    }
  },

  // ---------- tab ----------
  renderTab: function () {
    var c = this.el('tab-content');
    if (this.tab === 'skill') c.innerHTML = this.skillHTML();
    else if (this.tab === 'tempur') c.innerHTML = this.tempurHTML();
    else if (this.tab === 'tas') c.innerHTML = this.tasHTML();
    else if (this.tab === 'peta') c.innerHTML = this.petaHTML();
  },

  // ----- TAB SKILL -----
  skillHTML: function () {
    var s = Game.state, self = this;
    var resBar = '<div class="res-bar">' + Object.keys(RES).map(function (r) {
      return '<div class="res-chip">' + RES[r].icon + ' <b id="rc-' + r + '">' + self.fmt(s.res[r]) + '</b></div>';
    }).join('') + '</div>';

    var cards = SKILLS.map(function (def) {
      var sk = s.skills[def.id];
      var need = xpButuh(sk.lvl);
      var active = s.action && s.action.skill === def.id;
      var foot, click;
      if (def.noCard) {
        foot = '<span>Enchant item di tab Tas buat naik</span><span>✨</span>';
        click = "UI.go('tas')";
      } else {
        var cyc = cycleTime(def.id, sk.lvl).toFixed(1);
        var gainTxt = Object.keys(def.gain).map(function (r) {
          return '+' + def.gain[r] + ' ' + RES[r].icon;
        }).join(' ');
        var costTxt = def.cost ? ' <span class="cost">(' + Object.keys(def.cost).map(function (r) {
          return def.cost[r] + RES[r].icon;
        }).join(' ') + '/siklus)</span>' : '';
        foot = '<span id="xpt-' + def.id + '">' + self.fmt(need - sk.xp) + ' XP ke lvl ' + (sk.lvl + 1) + '</span>' +
               '<span>' + gainTxt + ' / ' + cyc + ' dtk' + costTxt + '</span>';
        click = "Game.startSkill('" + def.id + "')";
      }
      return '<div class="card skill-card' + (active ? ' active' : '') + '" id="card-' + def.id + '" onclick="' + click + '">' +
        '<div class="popup-layer"></div>' +
        '<div class="sk-head"><span class="sk-icon">' + def.icon + '</span>' +
        '<div class="sk-mid"><div class="sk-name">' + def.name + (active ? ' <span class="tag-aktif">jalan!</span>' : '') + '</div>' +
        '<div class="sk-desc">' + def.desc + '</div></div>' +
        '<div class="sk-lvl">' + sk.lvl + '</div></div>' +
        '<div class="xp-bar"><div class="xp-fill" id="xpf-' + def.id + '" style="width:' + self.pct(sk.xp, need) + '%"></div></div>' +
        '<div class="sk-foot">' + foot + '</div></div>';
    }).join('');

    return '<div class="sec-title">SKILL SIHIR <span class="sec-hint">ketuk kartu buat latih</span></div>' +
      resBar + cards + '<div style="height:12px"></div>';
  },

  // ----- TAB TEMPUR -----
  tempurHTML: function () {
    var s = Game.state, self = this;
    var z = zoneDef(s.zone);
    var stats =
      '<div class="card"><div class="combat-stats">' +
      '<div class="cstat"><span>⚔️ ATK</span><b>' + Game.atk() + '</b></div>' +
      '<div class="cstat"><span>🛡️ DEF</span><b>' + Game.def() + '</b></div>' +
      '<div class="cstat"><span>❤️ HP</span><b>' + Math.ceil(s.hp) + '/' + Game.maxHP() + '</b></div>' +
      '<div class="cstat"><span>🎖️ Lvl</span><b>' + s.tempur.lvl + '</b></div>' +
      '</div>' +
      '<div class="xp-bar"><div class="xp-fill" id="xpf-tempur" style="width:' + this.pct(s.tempur.xp, xpButuh(s.tempur.lvl)) + '%"></div></div>' +
      '<div class="sk-foot"><span id="xpt-tempur">' + this.fmt(xpButuh(s.tempur.lvl) - s.tempur.xp) + ' XP ke lvl ' + (s.tempur.lvl + 1) + '</span>' +
      '<button class="btn-mini ' + (s.autoEat ? 'on' : '') + '" onclick="Game.toggleAutoEat()">🧪 Makan otomatis: ' + (s.autoEat ? 'ON' : 'OFF') + '</button></div></div>';

    var mons = z.monsters.map(function (m, mi) {
      var st = monsterStats(m.lvl);
      var fighting = s.battle && s.battle.mi === mi;
      var cur = fighting ? Math.max(0, Math.ceil(s.battle.hp)) : st.hp;
      return '<div class="card mon-card' + (fighting ? ' active' : '') + '" id="card-mon-' + mi + '" onclick="Game.startBattle(' + mi + ')">' +
        '<div class="mon-head"><span class="sk-icon">' + m.icon + '</span>' +
        '<div class="sk-mid"><div class="sk-name">' + m.name + (m.boss ? ' 👑 <span class="tag-boss">BOSS</span>' : '') +
        (fighting ? ' <span class="tag-aktif">tarung!</span>' : '') + '</div>' +
        '<div class="sk-desc">Lvl ' + m.lvl + ' &nbsp;•&nbsp; ATK ' + st.atk + ' &nbsp;•&nbsp; +' + st.xp + ' XP</div></div></div>' +
        '<div class="ab-bar mon-hp"><div class="ab-fill mon-fill" id="mhp-fill-' + mi + '" style="width:' + self.pct(cur, st.hp) + '%"></div></div>' +
        '<div class="sk-foot"><span id="mhp-text-' + mi + '">HP ' + cur + ' / ' + st.hp + '</span><span>💰 ±' + st.gold + '</span></div></div>';
    }).join('');

    return '<div class="sec-title">' + z.icon + ' ' + z.name.toUpperCase() + ' <span class="sec-hint">ketuk monster buat tarung</span></div>' +
      stats + '<div class="sec-title">MONSTER</div>' + mons + '<div style="height:12px"></div>';
  },

  // ----- TAB TAS -----
  itemCard: function (item, inInv) {
    var r = rarityDef(item.rarity);
    var stats = ['atk', 'def', 'hp'].filter(function (k) { return item.stats[k] > 0; })
      .map(function (k) {
        var label = k === 'atk' ? 'A' : k === 'def' ? 'D' : 'HP';
        return label + '+' + itemStat(item, k);
      }).join(' ');
    var cost = enchantCost(item);
    var enchBtn = item.enchant >= 5
      ? '<span class="ench-max">+5 MAX</span>'
      : '<button class="btn-ench" onclick="event.stopPropagation();Game.enchantItem(' + item.id + ')">✨ +' + item.enchant +
        ' <small>' + cost.kristal + '💎 ' + cost.mana + '🔮</small></button>';
    var click = inInv ? 'onclick="Game.equipFromInv(' + item.id + ')"'
                      : 'onclick="Game.unequip(\'' + item.slot + '\')"';
    return '<div class="item-card" style="border-color:' + r.color + '" ' + click + '>' +
      '<span class="it-icon">' + item.icon + '</span>' +
      '<div class="it-mid"><div class="it-name" style="color:' + r.color + '">' + itemFullName(item) + '</div>' +
      '<div class="it-stats">' + stats + '</div></div>' + enchBtn + '</div>';
  },

  tasHTML: function () {
    var s = Game.state, self = this;
    var slots = SLOTS.map(function (sl) {
      var item = s.equip[sl.id];
      var inner = item ? self.itemCard(item, false)
        : '<div class="slot-empty"><span class="it-icon">' + sl.icon + '</span><div class="it-name dim">' + sl.name + ' — kosong</div></div>';
      return '<div class="slot-wrap"><div class="slot-label">' + sl.icon + ' ' + sl.name + '</div>' + inner + '</div>';
    }).join('');

    var inv = s.inv.length === 0
      ? '<div class="card dim-center">Tas masih kosong.<br>Kalahin monster biar dapat equipment!</div>'
      : s.inv.map(function (it) { return self.itemCard(it, true); }).join('');

    return '<div class="sec-title">EQUIPMENT <span class="sec-hint">ketuk item = pakai • ketuk slot = lepas</span></div>' +
      '<div class="equip-grid">' + slots + '</div>' +
      '<div class="sec-title">TAS (' + s.inv.length + ')</div>' + inv + '<div style="height:12px"></div>';
  },

  // ----- TAB PETA -----
  petaHTML: function () {
    var s = Game.state, self = this;
    return '<div class="sec-title">PETA DUNIA <span class="sec-hint">pilih zona bertarung</span></div>' +
      ZONES.map(function (z) {
        var locked = s.tempur.lvl < z.minLvl;
        var here = s.zone === z.id;
        var btn = here ? '<span class="tag-here">📍 Kamu di sini</span>'
          : locked ? '<button class="btn-go locked" disabled>🔒 Lvl ' + z.minLvl + '</button>'
          : '<button class="btn-go" onclick="Game.setZone(\'' + z.id + '\')">Ke sini</button>';
        return '<div class="card zone-card' + (here ? ' active' : '') + (locked ? ' locked' : '') + '">' +
          '<div class="sk-head"><span class="sk-icon">' + z.icon + '</span>' +
          '<div class="sk-mid"><div class="sk-name">' + z.name + '</div>' +
          '<div class="sk-desc">' + z.desc + '</div></div>' +
          '<div class="zone-lvl">Lvl ' + z.minLvl + '+</div></div>' +
          '<div class="zone-mon">' + z.monsters.map(function (m) { return m.icon + ' ' + m.name + ' (' + m.lvl + ')'; }).join(' • ') + '</div>' +
          '<div class="zone-foot">' + btn + '</div></div>';
      }).join('') + '<div style="height:12px"></div>';
  },

  // ---------- bottom nav ----------
  renderNav: function () {
    var tabs = [
      { id: 'skill',  icon: '✨', name: 'Skill' },
      { id: 'tempur', icon: '⚔️', name: 'Tempur' },
      { id: 'tas',    icon: '🎒', name: 'Tas' },
      { id: 'peta',   icon: '🗺️', name: 'Peta' },
    ];
    var self = this;
    this.el('bottomnav').innerHTML = tabs.map(function (t) {
      return '<button class="nav-btn' + (self.tab === t.id ? ' active' : '') + '" onclick="UI.go(\'' + t.id + '\')">' +
        '<span class="nav-icon">' + t.icon + '</span><span>' + t.name + '</span></button>';
    }).join('');
  },

  // ---------- per-tick update ringan ----------
  tickUpdate: function () {
    this.updateTopbar();
    this.updateActionBar();
    var s = Game.state;
    // resource counter
    Object.keys(RES).forEach(function (r) {
      var e = document.getElementById('rc-' + r);
      if (e) e.textContent = UI.fmt(s.res[r]);
    });
    // xp bar skill
    if (this.tab === 'skill') {
      SKILLS.forEach(function (def) {
        var sk = s.skills[def.id], need = xpButuh(sk.lvl);
        var f = document.getElementById('xpf-' + def.id);
        if (f) f.style.width = UI.pct(sk.xp, need) + '%';
      });
    }
    // hp bar monster (tempur)
    if (this.tab === 'tempur' && s.battle) {
      var mon = Game.currentMonster();
      if (mon) {
        var f = document.getElementById('mhp-fill-' + s.battle.mi);
        var t = document.getElementById('mhp-text-' + s.battle.mi);
        if (f) f.style.width = UI.pct(mon.hp, mon.maxhp) + '%';
        if (t) t.textContent = 'HP ' + Math.max(0, Math.ceil(mon.hp)) + ' / ' + mon.maxhp;
      }
    }
  },

  // ---------- toast ----------
  toast: function (msg) {
    var t = this.el('toast');
    t.textContent = msg;
    t.classList.add('show');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    var self = this;
    this.toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  },

  // ---------- popup +XP melayang ----------
  spawnPopup: function (anchorId, text) {
    var a = this.el(anchorId);
    if (!a) return;
    var layer = a.querySelector('.popup-layer') || a;
    var sp = document.createElement('span');
    sp.className = 'float-pop';
    sp.textContent = text;
    layer.appendChild(sp);
    setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 1300);
  },

  // ---------- modal welcome back ----------
  showWelcomeBack: function (summary) {
    var jam = Math.floor(summary.elapsed / 3600);
    var mnt = Math.floor((summary.elapsed % 3600) / 60);
    var dur = jam > 0 ? jam + ' jam ' + mnt + ' mnt' : mnt + ' mnt';
    var html =
      '<div class="modal-card"><div class="modal-title">🌙 Selamat datang kembali!</div>' +
      '<div class="modal-sub">Kamu offline ' + dur + '. Dengan 50% kecepatan, kamu dapat:</div>' +
      '<div class="modal-list">' + summary.lines.map(function (l) { return '<div>• ' + l + '</div>'; }).join('') + '</div>' +
      '<button class="btn-go" onclick="UI.closeModal()">Siap!</button></div>';
    var m = this.el('modal');
    m.innerHTML = html;
    m.classList.remove('hidden');
  },
  closeModal: function () {
    this.el('modal').classList.add('hidden');
  },
};
