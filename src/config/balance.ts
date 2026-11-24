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
export const START_TINH_PER_ELEMENT = 15; // E4 cân bằng: 10 → 15 để đủ dựng trận đầu ván đa hệ

// E2: hình học vòng/ô/cổng nằm trong config/maps.ts theo từng bản đồ — không còn hằng số 2 vòng ở đây.
export const CENTER_HP = 300;
export const CENTER_ATTACK_RANGE = 0.75; // quái tới khoảng cách này thì đánh trung tâm

export const HERO = {
  hp: 240, // E4 cân bằng: 220 → 240 để nhân vật không gục sớm ở bản đồ lớn
  dmg: 12,
  range: 2.6,
  atkPerSec: 1.1,
  speed: 2.2,
  baseCritChance: 0.05,
  baseArmor: 3, // E4 cân bằng: giáp cơ bản để nhân vật bớt mong manh ở bản đồ lớn
  baseRegenPerSec: 0.6, // E4: hồi máu cơ bản nhỏ, Mộc cộng thêm
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

// E1 — Tương sinh / tương khắc giữa hai trụ KỀ NHAU trong cùng một vòng.
// Chuỗi tương sinh: Kim→Thủy→Mộc→Hỏa→Thổ→Kim (SINH_NEXT[a] = hệ mà a sinh ra).
export const SINH_NEXT: Record<Element, Element> = {
  kim: 'thuy', thuy: 'moc', moc: 'hoa', hoa: 'tho', tho: 'kim',
};
// Quan hệ tương khắc: KHAC[a] = hệ mà a khắc (Kim khắc Mộc, Mộc khắc Thổ,
// Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim).
export const KHAC: Record<Element, Element> = {
  kim: 'moc', moc: 'tho', tho: 'thuy', thuy: 'hoa', hoa: 'kim',
};
export const SINH_BONUS_PER_NEIGHBOR = 0.15; // mỗi phía kề tương sinh: +15% dmg (tối đa 2 phía = +30%)
export const KHAC_ATTACKER_BONUS = 0.10;     // trụ khắc trụ kề: +10% dmg
export const KHAC_VICTIM_PENALTY = 0.10;     // trụ bị khắc bởi trụ kề: −10% dmg

// E1 — Linh Mạch: mỗi đợt có 1–2 ô được đánh dấu, trụ trên ô +25% sát thương trong đợt đó.
export const LINH_MACH_MIN = 1;
export const LINH_MACH_MAX = 2;
export const LINH_MACH_DMG_BONUS = 0.25;

export const TICK_RATE = 20; // sim tick cố định 20Hz
export const SPAWN_DISTANCE = 7.6;
