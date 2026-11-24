import type { Element } from '../config/balance';
import { DAO_NGO_NODES } from '../config/daongo';

// E3 — Bộ sửa đổi áp vào một ván chơi, suy ra từ các nút Đạo Ngộ đã sở hữu.
export interface RunModifiers {
  startLtBonus: number;
  startTinhBonus: number; // cộng cho mỗi hệ
  priceDiscount: Record<Element, number>; // 0..1 theo hệ
  centerHpBonus: number;
  extraLinhMach: number;
  heroMaxHpBonus: number;
  ultCdMul: number;
}

export function noModifiers(): RunModifiers {
  return {
    startLtBonus: 0,
    startTinhBonus: 0,
    priceDiscount: { kim: 0, moc: 0, thuy: 0, hoa: 0, tho: 0 },
    centerHpBonus: 0,
    extraLinhMach: 0,
    heroMaxHpBonus: 0,
    ultCdMul: 1,
  };
}

/** Thuần: gộp hiệu ứng của mọi nút đã sở hữu thành một RunModifiers. */
export function modifiersFromNodes(owned: string[]): RunModifiers {
  const m = noModifiers();
  for (const node of DAO_NGO_NODES) {
    if (!owned.includes(node.id)) continue;
    const e = node.effect;
    m.startLtBonus += e.startLt ?? 0;
    m.startTinhBonus += e.startTinhPerElement ?? 0;
    if (e.priceDiscountElement && e.priceDiscountPct) {
      m.priceDiscount[e.priceDiscountElement] = Math.max(m.priceDiscount[e.priceDiscountElement], e.priceDiscountPct);
    }
    m.centerHpBonus += e.centerHpBonus ?? 0;
    m.extraLinhMach += e.extraLinhMach ?? 0;
    m.heroMaxHpBonus += e.heroMaxHpBonus ?? 0;
    if (e.ultCdMul) m.ultCdMul *= e.ultCdMul;
  }
  return m;
}
