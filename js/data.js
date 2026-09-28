// ============================================================
// IDLE FANTASY — data statis: skill, zona, monster, item
// Vanilla JS, tanpa dependensi.
// ============================================================

// Kurva XP: xpButuh(level) = floor(60 * level^1.55)
function xpButuh(level) {
  return Math.floor(60 * Math.pow(level, 1.55));
}

// ---------- Resource ----------
const RES = {
  mana:    { name: 'Mana',    icon: '🔮' },
  herba:   { name: 'Herba',   icon: '🌿' },
  kristal: { name: 'Kristal', icon: '💎' },
  ramuan:  { name: 'Ramuan',  icon: '🧪' },
};

// ---------- Skill latih (5 kartu di tab Skill) ----------
// gain: resource yang didapat per siklus. cost: bahan per siklus (alkimia).
const SKILLS = [
  { id: 'meditasi', name: 'Meditasi Mana',   icon: '🧘',
    desc: 'Duduk santai, sedot mana dari udara.',
    cat: 'Sihir', catColor: '#a78bfa',
    cycle: 3.0, xp: 8,  gain: { mana: 1 } },
  { id: 'herba',    name: 'Kumpul Herba',    icon: '🌿',
    desc: 'Metik tanaman ajaib di semak-semak.',
    cat: 'Pengumpul', catColor: '#22c55e',
    cycle: 3.5, xp: 8,  gain: { herba: 1 } },
  { id: 'kristal',  name: 'Tambang Kristal', icon: '⛏️',
    desc: 'Pecahin kristal mana yang berkilau.',
    cat: 'Pengumpul', catColor: '#22c55e',
    cycle: 4.0, xp: 10, gain: { kristal: 1 } },
  { id: 'alkimia',  name: 'Alkimia',         icon: '⚗️',
    desc: 'Racik herba + mana jadi ramuan penyembuh.',
    cat: 'Produksi', catColor: '#fb923c',
    cycle: 4.0, xp: 15, gain: { ramuan: 1 }, cost: { herba: 2, mana: 2 } },
  { id: 'enchanting', name: 'Enchanting',    icon: '✨',
    desc: 'Sihir penguat equipment. Enchant item di tab Tas.',
    cat: 'Sihir', catColor: '#a78bfa',
    cycle: 0, xp: 0, gain: {}, noCard: true }, // tidak ada kartu latih; XP dari enchanting item
];

function skillDef(id) {
  return SKILLS.find(function (s) { return s.id === id; });
}

// Waktu siklus: -2% per level skill, minimal 1 detik
function cycleTime(skillId, level) {
  var base = skillDef(skillId).cycle;
  return Math.max(1, base * Math.pow(0.98, level - 1));
}

// ---------- Zona & monster ----------
const ZONES = [
  { id: 'hutan', name: 'Hutan Berbisik', icon: '🌲', minLvl: 1,
    desc: 'Pepohonan tua yang suka ngobrol sendiri.',
    monsters: [
      { name: 'Goblin',           lvl: 1, icon: '👺' },
      { name: 'Serigala Bayangan', lvl: 4, icon: '🐺' },
      { name: 'Treant Tua',       lvl: 7, icon: '🌳' },
    ] },
  { id: 'gua', name: 'Gua Kristal', icon: '💎', minLvl: 10,
    desc: 'Gelap, berkilau, dan bahaya.',
    monsters: [
      { name: 'Kelelawar Gua',  lvl: 10, icon: '🦇' },
      { name: 'Golem Kristal',  lvl: 14, icon: '🗿' },
      { name: 'Basilisk',       lvl: 18, icon: '🐍' },
    ] },
  { id: 'rawa', name: 'Rawa Kelam', icon: '🐸', minLvl: 20,
    desc: 'Lumpur bau plus makhluk aneh.',
    monsters: [
      { name: 'Hantu Rawa',     lvl: 20, icon: '👻' },
      { name: 'Penyihir Sesat', lvl: 24, icon: '🧙' },
      { name: 'Hydra Rawa',     lvl: 28, icon: '🐉' },
    ] },
  { id: 'menara', name: 'Menara Gelap', icon: '🗼', minLvl: 30,
    desc: 'Puncak kegelapan. Bawa bekal yang banyak.',
    monsters: [
      { name: 'Ksatria Kegelapan', lvl: 30, icon: '⚔️' },
      { name: 'Iblis Menara',      lvl: 34, icon: '😈' },
      { name: 'Lich Azghar',       lvl: 38, icon: '👑', boss: true },
    ] },
];

function zoneDef(id) {
  return ZONES.find(function (z) { return z.id === id; });
}

// Stat monster dari level: HP = 30*lvl^1.25, ATK = 3*lvl^1.08,
// XP = 12*lvl, gold = 4*lvl
function monsterStats(lvl) {
  return {
    hp:   Math.round(30 * Math.pow(lvl, 1.25)),
    atk:  Math.round(3 * Math.pow(lvl, 1.08)),
    xp:   12 * lvl,
    gold: 4 * lvl,
  };
}

// ---------- Equipment ----------
const RARITIES = [
  { id: 'biasa',     name: 'Biasa',     color: '#9aa0a6', mult: 1.0, w: 50 },
  { id: 'sihir',     name: 'Sihir',     color: '#4da3ff', mult: 1.5, w: 28 },
  { id: 'langka',    name: 'Langka',    color: '#ffd54d', mult: 2.2, w: 14 },
  { id: 'epik',      name: 'Epik',      color: '#c678ff', mult: 3.2, w: 6 },
  { id: 'legendaris', name: 'Legendaris', color: '#ff9a3c', mult: 4.5, w: 2 },
];

function rarityDef(id) {
  return RARITIES.find(function (r) { return r.id === id; });
}

const SLOTS = [
  { id: 'senjata', name: 'Senjata', icon: '🗡️', stats: ['atk'] },
  { id: 'perisai', name: 'Perisai', icon: '🛡️', stats: ['def'] },
  { id: 'helm',    name: 'Helm',    icon: '🪖', stats: ['hp'] },
  { id: 'armor',   name: 'Armor',   icon: '🥋', stats: ['def', 'hp'] },
  { id: 'sepatu',  name: 'Sepatu',  icon: '👟', stats: ['hp'] },
  { id: 'cincin',  name: 'Cincin',  icon: '💍', stats: ['atk'] },
];

function slotDef(id) {
  return SLOTS.find(function (s) { return s.id === id; });
}

const ITEM_NAMES = {
  senjata: ['Pedang Kayu', 'Belati Besi', 'Pedang Baja', 'Staf Rune', 'Pedang Kristal', 'Blade Arcane'],
  perisai: ['Perisai Kayu', 'Perisai Besi', 'Perisai Baja', 'Aegis Rune', 'Perisai Kristal'],
  helm:    ['Topi Kain', 'Helm Besi', 'Helm Baja', 'Mahkota Rune', 'Helm Kristal'],
  armor:   ['Jubah Kain', 'Armor Kulit', 'Armor Besi', 'Armor Baja', 'Armor Kristal'],
  sepatu:  ['Sandal Jerami', 'Sepatu Kulit', 'Sepatu Besi', 'Sepatu Swift', 'Sepatu Kristal'],
  cincin:  ['Cincin Tembaga', 'Cincin Perak', 'Cincin Emas', 'Cincin Rune', 'Cincin Kristal'],
};

function rollRarity() {
  var total = RARITIES.reduce(function (a, r) { return a + r.w; }, 0);
  var roll = Math.random() * total, acc = 0;
  for (var i = 0; i < RARITIES.length; i++) {
    acc += RARITIES[i].w;
    if (roll < acc) return RARITIES[i].id;
  }
  return 'biasa';
}

function rand(a, b) {
  return a + Math.random() * (b - a);
}

// Bikin 1 equipment. monsterLvl = level monster yang di-drop.
function genItem(monsterLvl, forceSlot) {
  var slot = forceSlot || SLOTS[Math.floor(Math.random() * SLOTS.length)].id;
  var def = slotDef(slot);
  var rarity = rollRarity();
  var mult = rarityDef(rarity).mult;
  var names = ITEM_NAMES[slot];
  var nameIdx = Math.min(names.length - 1, Math.floor(monsterLvl / 8));
  var stats = { atk: 0, def: 0, hp: 0 };
  def.stats.forEach(function (st) {
    var base = st === 'atk' ? (2 + monsterLvl * 1.2)
             : st === 'def' ? (1 + monsterLvl * 0.8)
             : (5 + monsterLvl * 3);
    // armor: bagi rata ke dua stat
    if (def.stats.length > 1) base = base * 0.7;
    stats[st] = Math.max(1, Math.round(base * mult * rand(0.9, 1.1)));
  });
  return {
    id: 0, // diisi Game
    slot: slot, icon: def.icon,
    name: names[nameIdx],
    rarity: rarity,
    stats: stats,
    enchant: 0,
  };
}

// Stat efektif item (termasuk bonus enchant +8%/level)
function itemStat(item, key) {
  return Math.round(item.stats[key] * (1 + 0.08 * item.enchant));
}

function itemFullName(item) {
  return '[' + rarityDef(item.rarity).name + '] ' + item.name + (item.enchant > 0 ? ' +' + item.enchant : '');
}

// Biaya enchant: (1+lvl) Kristal + (2*lvl) Mana, max +5
function enchantCost(item) {
  return { kristal: 1 + item.enchant, mana: 2 * item.enchant };
}
