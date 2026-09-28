// ============================================================
// IDLE FANTASY — tampilan ala Realm Idle
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

  // ---------- action strip ----------
  renderActionBar: function () {
    var s = Game.state, bar = this.el('actionbar');
    if (!s.action && !s.battle) { bar.classList.add('hidden'); bar.innerHTML = ''; return; }
    bar.classList.remove('hidden');
    var icon, name, sub, fillCls = '';
    if (s.action) {
      var def = skillDef(s.action.skill);
      icon = def.icon; name = def.name; sub = def.cat;
    } else {
      var mon = Game.currentMonster();
      icon = mon.def.icon; name = mon.def.name + (mon.def.boss ? ' 👑' : ''); sub = 'Tempur';
      fillCls = ' mon-fill';
    }
    bar.innerHTML =
      '<div class="ab-strip" id="ab-card" style="position:relative">' +
      '<span class="ab-icon">' + icon + '</span>' +
      '<div class="ab-mid"><div class="ab-title"><b>' + name + '</b><span>' + sub + '</span></div>' +
      '<div class="ab-bar"><div class="ab-fill' + fillCls + '" id="ab-fill"></div></div></div>' +
      '<button class="btn-stop" onclick="UI.stopActive()">Stop</button></div>';
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
      if (mon) fill.style.width = this.pct(mon.hp, mon.maxhp) + '%';
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

  // ----- kartu skill (grid) -----
  skillCard: function (def, lvl, xp, active, click, footOverride) {
    var need = xpButuh(lvl);
    var foot = footOverride !== undefined ? footOverride
      : this.fmt(need - xp) + ' XP ke lvl ' + (lvl + 1);
    return '<div class="sk-card' + (active ? ' active' : '') + '" id="card-' + def.id + '" onclick="' + click + '">' +
      '<div class="sk-icon">' + def.icon + '</div>' +
      '<div class="sk-name">' + def.name + '</div>' +
      '<div class="sk-cat" style="color:' + def.catColor + '">' + def.cat + '</div>' +
      '<div class="sk-lvl">' + lvl + '</div>' +
      '<div class="xp-bar"><div class="xp-fill" id="xpf-' + def.id + '" style="width:' + this.pct(xp, need) + '%"></div></div>' +
      '<div class="sk-xp" id="xpt-' + def.id + '">' + foot + '</div></div>';
  },

  // ----- TAB SKILL -----
  skillHTML: function () {
    var s = Game.state, self = this;
    var resBar = '<div class="res-bar">' + Object.keys(RES).map(function (r) {
      return '<div class="res-chip">' + RES[r].icon + '<b id="rc-' + r + '">' + self.fmt(s.res[r]) + '</b></div>';
    }).join('') + '</div>';

    var cards = SKILLS.map(function (def) {
      var sk = s.skills[def.id];
      var active = !!(s.action && s.action.skill === def.id);
      var click = def.noCard ? "UI.go('tas')" : "Game.startSkill('" + def.id + "')";
      var foot = def.noCard ? 'Enchant di Tas' : undefined;
      return self.skillCard(def, sk.lvl, sk.xp, active, click, foot);
    }).join('');

    var t = s.tempur;
    var tempurDef = { id: 'tempur', name: 'Tempur', icon: '⚔️', cat: 'Tempur', catColor: '#ef4444' };
    var tempurCard = this.skillCard(tempurDef, t.lvl, t.xp,
      !!s.battle, "UI.go('tempur')");

    return '<div class="sec-title">Skill Sihir <span class="sec-sub">- (ketuk untuk latih)</span></div>' +
      resBar +
      '<div class="skill-grid">' + cards + '</div>' +
      '<div class="sec-title">Skill Tempur <span class="sec-sub">- (ketuk buat tarung)</span></div>' +
      '<div class="skill-grid">' + tempurCard + '</div>' +
      '<div style="height:8px"></div>';
  },

  // ----- TAB TEMPUR -----
  tempurHTML: function () {
    var s = Game.state, self = this;
    var z = zoneDef(s.zone);
    var stats =
      '<div class="stat-row">' +
      '<div class="stat-box"><span style="color:#f87171">ATK</span><b>' + Game.atk() + '</b></div>' +
      '<div class="stat-box"><span style="color:#60a5fa">DEF</span><b>' + Game.def() + '</b></div>' +
      '<div class="stat-box"><span style="color:#4ade80">HP</span><b>' + Math.ceil(s.hp) + '</b></div>' +
      '<div class="stat-box"><span style="color:#a78bfa">LVL</span><b>' + s.tempur.lvl + '</b></div>' +
      '</div>' +
      '<div class="toggle-row"><button class="pill-toggle' + (s.autoEat ? '' : ' off') + '" onclick="Game.toggleAutoEat()">Makan Otomatis ' + (s.autoEat ? 'ON' : 'OFF') + '</button></div>';

    var mons = z.monsters.map(function (m, mi) {
      var st = monsterStats(m.lvl);
      var fighting = s.battle && s.battle.mi === mi;
      return '<div class="mon-card' + (fighting ? ' active' : '') + '" id="card-mon-' + mi + '" onclick="Game.startBattle(' + mi + ')">' +
        '<div class="mon-icon">' + m.icon + '</div>' +
        '<div class="mon-mid"><div class="mon-name">' + m.name +
        (fighting ? ' <span class="fighting-tag">• tarung!</span>' : '') + '</div>' +
        '<div class="mon-sub">Lvl ' + m.lvl + ' | HP ' + st.hp + ' | ATK ' + st.atk + '</div></div>' +
        (m.boss ? '<span class="boss-badge">BOSS</span>' : '') + '</div>';
    }).join('');

    return '<div class="sec-title">' + z.icon + ' ' + z.name + '</div>' +
      stats +
      '<div class="sec-title">Monster</div>' + mons + '<div style="height:8px"></div>';
  },

  // ----- TAB TAS -----
  eqCell: function (sl) {
    var s = Game.state;
    var item = s.equip[sl.id];
    if (!item) {
      return '<div class="eq-cell empty"><div class="eq-icon dim">' + sl.icon + '</div>' +
        '<div class="eq-slotname">' + sl.name + '</div></div>';
    }
    var r = rarityDef(item.rarity);
    var stats = ['atk', 'def', 'hp'].filter(function (k) { return item.stats[k] > 0; })
      .map(function (k) {
        var label = k === 'atk' ? 'A' : k === 'def' ? 'D' : 'HP';
        return label + '+' + itemStat(item, k);
      }).join(' ');
    var ench;
    if (item.enchant >= 5) {
      ench = '<div class="eq-ench" style="border:none;color:var(--gold)">+5 MAX</div>';
    } else {
      var cost = enchantCost(item);
      ench = '<button class="eq-ench" onclick="event.stopPropagation();Game.enchantItem(' + item.id + ')">✨+' +
        item.enchant + ' <span style="opacity:.75">' + cost.kristal + '💎' + cost.mana + '🔮</span></button>';
    }
    return '<div class="eq-cell" style="border-color:' + r.color + '" onclick="Game.unequip(\'' + item.slot + '\')">' +
      '<div class="eq-icon">' + item.icon + '</div>' +
      '<div class="eq-name" style="color:' + r.color + '">' + item.name + (item.enchant > 0 ? ' +' + item.enchant : '') + '</div>' +
      '<div class="eq-stats">' + stats + '</div>' + ench + '</div>';
  },

  tasHTML: function () {
    var s = Game.state, self = this;
    var grid = '<div class="equip-grid">' +
      SLOTS.map(function (sl) { return self.eqCell(sl); }).join('') + '</div>';

    var inv = s.inv.length === 0
      ? '<div class="inv-empty">Tas masih kosong.<br>Kalahin monster biar dapat equipment!</div>'
      : s.inv.map(function (it) {
          var r = rarityDef(it.rarity);
          var stats = ['atk', 'def', 'hp'].filter(function (k) { return it.stats[k] > 0; })
            .map(function (k) {
              var label = k === 'atk' ? 'A' : k === 'def' ? 'D' : 'HP';
              return label + '+' + itemStat(it, k);
            }).join(' ');
          var cost = enchantCost(it);
          var ench = it.enchant >= 5 ? '<span style="font-size:11px;color:var(--gold);font-weight:800">+5</span>'
            : '<button class="eq-ench" onclick="event.stopPropagation();Game.enchantItem(' + it.id + ')">✨ ' + cost.kristal + '💎' + cost.mana + '🔮</button>';
          return '<div class="inv-card" style="border-color:' + r.color + '" onclick="Game.equipFromInv(' + it.id + ')">' +
            '<div class="mon-icon">' + it.icon + '</div>' +
            '<div class="mon-mid"><div class="mon-name" style="font-size:14px;color:' + r.color + '">' + itemFullName(it) + '</div>' +
            '<div class="mon-sub">' + stats + '</div></div>' + ench + '</div>';
        }).join('');

    return '<div class="sec-title">Equipment <span class="sec-sub">- (ketuk: pakai / lepas)</span></div>' + grid +
      '<div class="sec-title">Tas (' + s.inv.length + ')</div>' + inv + '<div style="height:8px"></div>';
  },

  // ----- TAB PETA -----
  petaHTML: function () {
    var s = Game.state;
    var cards = ZONES.map(function (z) {
      var locked = s.tempur.lvl < z.minLvl;
      var here = s.zone === z.id;
      var act;
      if (here) act = '<span class="here-text">📍 Kamu di sini</span>';
      else if (locked) act = '<span class="locked-text">🔒 Terkunci</span>';
      else act = '<button class="btn-go" onclick="Game.setZone(\'' + z.id + '\')">Ke Sini</button>';
      return '<div class="zone-card' + (here ? ' here' : '') + (locked ? ' locked' : '') + '">' +
        '<div class="zone-top"><div class="zone-name">' + z.icon + ' ' + z.name + '</div>' +
        '<div class="zone-lvl">Lvl ' + z.minLvl + '+</div></div>' +
        '<div class="zone-desc">' + z.desc + '</div>' +
        '<div class="zone-mon">' + z.monsters.map(function (m) { return m.icon + ' ' + m.name; }).join(' • ') + '</div>' +
        '<div class="zone-act">' + act + '</div></div>';
    }).join('');
    return '<div class="sec-title">Peta Dunia</div>' + cards + '<div style="height:8px"></div>';
  },

  // ---------- bottom nav ----------
  renderNav: function () {
    var tabs = [
      { id: 'skill',  icon: '🔮', name: 'Skill' },
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
    Object.keys(RES).forEach(function (r) {
      var e = document.getElementById('rc-' + r);
      if (e) e.textContent = UI.fmt(s.res[r]);
    });
    if (this.tab === 'skill') {
      SKILLS.forEach(function (def) {
        var sk = s.skills[def.id]; if (!sk) return;
        var need = xpButuh(sk.lvl);
        var f = document.getElementById('xpf-' + def.id);
        if (f) f.style.width = UI.pct(sk.xp, need) + '%';
        var t = document.getElementById('xpt-' + def.id);
        if (t && !def.noCard) t.textContent = UI.fmt(need - sk.xp) + ' XP ke lvl ' + (sk.lvl + 1);
      });
      var tf = document.getElementById('xpf-tempur');
      if (tf) tf.style.width = UI.pct(s.tempur.xp, xpButuh(s.tempur.lvl)) + '%';
      var tt = document.getElementById('xpt-tempur');
      if (tt) tt.textContent = UI.fmt(xpButuh(s.tempur.lvl) - s.tempur.xp) + ' XP ke lvl ' + (s.tempur.lvl + 1);
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

  // ---------- popup XP kotak emas ----------
  spawnPopup: function (anchorId, title, lines) {
    var a = this.el(anchorId);
    if (!a) return;
    var cs = window.getComputedStyle(a);
    if (cs.position === 'static') a.style.position = 'relative';
    var box = document.createElement('div');
    box.className = 'xp-pop';
    var html = '<div class="xp-pop-title">' + title + '</div>';
    if (lines && lines.length) {
      html += '<div class="xp-pop-xp">' + lines[0] + '</div>';
      if (lines.length > 1) {
        html += '<div class="xp-pop-div"></div>' +
          lines.slice(1).map(function (l) { return '<div class="xp-pop-gain">' + l + '</div>'; }).join('');
      }
    }
    box.innerHTML = html;
    a.appendChild(box);
    setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 1450);
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
