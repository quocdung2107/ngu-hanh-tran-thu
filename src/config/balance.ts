// Mọi hằng số cân bằng tập trung tại đây — logic gameplay không hardcode số.
export const ELEMENTS = ['kim', 'moc', 'thuy', 'hoa', 'tho'] as const;
export type Element = (typeof ELEMENTS)[number];

export const ELEMENT_NAMES: Record<Element, string> = {
  kim: 'Kim', moc: 'Mộc', thuy: 'Thủy', hoa: 'Hỏa', tho: 'Thổ',
};
export const ELEMENT_COLORS: Record<Element, string> = {
  kim: '#f5d76e', moc: '#58c472', thuy: '#4aa8e0', hoa: '#e05a3a', tho: '#b08954',
};

export const START_LINH_THACH = 200;
export const START_TINH_PER_ELEMENT = 10;

export const RING_COUNT = 2;
export const SLOTS_PER_RING = 5;
export const RING_RADII: number[] = [2.0, 3.8]; // vòng 1 (trong), vòng 2 (ngoài)
export const RING_NAMES: string[] = ['Vòng 1 (trong)', 'Vòng 2 (ngoài)'];

export const CENTER_HP = 300;
export const CENTER_ATTACK_RANGE = 0.75; // quái tới khoảng cách này thì đánh trung tâm

export const HERO = {
  hp: 220,
  dmg: 12,
  range: 2.6,
  atkPerSec: 1.1,
  speed: 2.2,
  baseCritChance: 0.05,
  baseArmor: 0,
  baseDodge: 0,
  homeRadius: 6, // không rời trung tâm quá bán kính này
  manaMax: 100,
  manaStart: 100,
  manaRegenPerSec: 4,
};

// Cộng thuộc tính nhân vật cho MỖI trụ đang sống của từng hệ (mất khi trụ bị phá).
export const ELEMENT_STAT_BONUS: Record<Element, {
  dmg: number; critChance: number; hpRegenPerSec: number; maxHp: number;
  armor: number; dodge: number; skillDmgMulBonus: number;
}> = {
  kim:  { dmg: 3, critChance: 0.01, hpRegenPerSec: 0,    maxHp: 0,  armor: 0, dodge: 0,    skillDmgMulBonus: 0 },
  moc:  { dmg: 0, critChance: 0,    hpRegenPerSec: 0.4,  maxHp: 10, armor: 0, dodge: 0,    skillDmgMulBonus: 0 },
  thuy: { dmg: 0, critChance: 0,    hpRegenPerSec: 0,    maxHp: 0,  armor: 2, dodge: 0.01, skillDmgMulBonus: 0 },
  hoa:  { dmg: 0, critChance: 0,    hpRegenPerSec: 0,    maxHp: 0,  armor: 0, dodge: 0,    skillDmgMulBonus: 0.04 },
  tho:  { dmg: 0, critChance: 0,    hpRegenPerSec: 0,    maxHp: 15, armor: 2, dodge: 0,    skillDmgMulBonus: 0 },
};

// D2 — tuyệt kỹ AoE của vòng.
export const AOE_MIN_TOWERS = 3;
export const AOE_MIN_ENEMIES = 3;
export const AOE_POWER_SCALE: Record<number, number> = { 3: 0.6, 4: 0.8, 5: 1.0 };
export const AOE_RADIUS_BONUS = 1.1; // bán kính AoE = bán kính vòng + giá trị này

// D4 — tầm bám của quái.
export const AGGRO_RANGE = 1.1;

export const TICK_RATE = 20; // sim tick cố định 20Hz
export const SPAWN_DISTANCE = 7.6;
export const GATES: Array<{ x: number; y: number; name: string }> = [
  { x: 0, y: -SPAWN_DISTANCE, name: 'Bắc' },
  { x: SPAWN_DISTANCE, y: 0, name: 'Đông' },
  { x: 0, y: SPAWN_DISTANCE, name: 'Nam' },
  { x: -SPAWN_DISTANCE, y: 0, name: 'Tây' },
];
