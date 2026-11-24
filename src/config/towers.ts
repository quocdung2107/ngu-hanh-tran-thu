import type { Element } from './balance';

export interface TowerDef {
  element: Element;
  name: string;
  costLinhThach: number;
  costTinh: number; // tinh cùng hệ
  dmg: number;
  range: number;
  atkPerSec: number;
  hp: number;
  desc: string;
  // tham số hiệu ứng riêng
  critChance?: number; critMul?: number;           // Kim
  rootSec?: number; rootInternalCd?: number;       // Mộc
  slowPct?: number; slowSec?: number;              // Thủy
  splashRadius?: number; splashMul?: number;       // Hỏa
  stunSec?: number;                                // Thổ
}

// E1 — Nâng cấp trụ (tối đa cấp 3). Giá nâng cấp tính theo % giá xây (cùng loại tài nguyên).
export const MAX_TOWER_LEVEL = 3;
export const LEVEL_DMG_MUL: Record<number, number> = { 1: 1, 2: 1.6, 3: 2.5 };
export const LEVEL_HP_MUL: Record<number, number> = { 1: 1, 2: 1.5, 3: 1.5 };
export const LEVEL_EFFECT_MUL: Record<number, number> = { 1: 1, 2: 1, 3: 1.5 }; // cấp 3: hiệu ứng phụ mạnh hơn
export const UPGRADE_COST_MUL: Record<number, number> = { 2: 0.6, 3: 1.2 }; // theo cấp đích

/** Chi phí nâng trụ `element` lên cấp `toLevel` (làm tròn, tối thiểu 1). */
export function upgradeCostFor(element: Element, toLevel: number): { linhThach: number; tinh: number } {
  const def = TOWER_DEFS[element];
  const mul = UPGRADE_COST_MUL[toLevel] ?? 0;
  return {
    linhThach: Math.max(1, Math.round(def.costLinhThach * mul)),
    tinh: Math.max(1, Math.round(def.costTinh * mul)),
  };
}

export const TOWER_DEFS: Record<Element, TowerDef> = {
  kim: {
    element: 'kim', name: 'Kim Trụ', costLinhThach: 40, costTinh: 5,
    dmg: 14, range: 3.4, atkPerSec: 0.9, hp: 80,
    critChance: 0.10, critMul: 2,
    desc: 'Kiếm khí đơn mục tiêu, 10% chí mạng ×2.',
  },
  moc: {
    element: 'moc', name: 'Mộc Trụ', costLinhThach: 40, costTinh: 5,
    dmg: 8, range: 3.2, atkPerSec: 0.8, hp: 100,
    rootSec: 0.6, rootInternalCd: 3,
    desc: 'Dây leo trói 0.6s (mỗi quái tối đa 1 lần / 3s).',
  },
  thuy: {
    element: 'thuy', name: 'Thủy Trụ', costLinhThach: 40, costTinh: 5,
    dmg: 9, range: 3.6, atkPerSec: 1.0, hp: 85,
    slowPct: 0.30, slowSec: 1.5,
    desc: 'Làm chậm 30% trong 1.5s.',
  },
  hoa: {
    element: 'hoa', name: 'Hỏa Trụ', costLinhThach: 40, costTinh: 5,
    dmg: 12, range: 3.2, atkPerSec: 0.7, hp: 75,
    splashRadius: 0.8, splashMul: 0.5,
    desc: 'Hỏa cầu nổ diện nhỏ, 50% sát thương lan trong 0.8.',
  },
  tho: {
    element: 'tho', name: 'Thổ Trụ', costLinhThach: 40, costTinh: 5,
    dmg: 10, range: 3.0, atkPerSec: 0.6, hp: 130,
    stunSec: 0.3,
    desc: 'Sóng đất gây choáng 0.3s.',
  },
};
