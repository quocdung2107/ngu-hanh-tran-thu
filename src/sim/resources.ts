import { TOWER_DEFS } from '../config/towers';
import type { Element } from '../config/balance';
import type { GameState } from './state';

export function canAffordCost(state: GameState, element: Element, linhThach: number, tinh: number): boolean {
  return state.resources.linhThach >= linhThach && state.resources.tinh[element] >= tinh;
}

/** Trừ một khoản chi phí (Linh Thạch + tinh của `element`). Không đủ → không trừ gì, trả false. */
export function payCost(state: GameState, element: Element, linhThach: number, tinh: number): boolean {
  if (!canAffordCost(state, element, linhThach, tinh)) return false;
  state.resources.linhThach -= linhThach;
  state.resources.tinh[element] -= tinh;
  return true;
}

/** E3: áp giảm giá Đạo Ngộ theo hệ lên một khoản chi phí (áp cho cả Linh Thạch và tinh). */
export function discountedCost(state: GameState, element: Element, linhThach: number, tinh: number): { linhThach: number; tinh: number } {
  const d = state.modifiers.priceDiscount[element] ?? 0;
  if (d <= 0) return { linhThach, tinh };
  return {
    linhThach: Math.max(1, Math.round(linhThach * (1 - d))),
    tinh: Math.max(1, Math.round(tinh * (1 - d))),
  };
}

/** Giá xây trụ hiệu dụng sau giảm giá Đạo Ngộ. */
export function effectiveBuildCost(state: GameState, element: Element): { linhThach: number; tinh: number } {
  const def = TOWER_DEFS[element];
  return discountedCost(state, element, def.costLinhThach, def.costTinh);
}

export function canAfford(state: GameState, element: Element): boolean {
  const c = effectiveBuildCost(state, element);
  return canAffordCost(state, element, c.linhThach, c.tinh);
}

/** Trừ đúng chi phí xây trụ (đã gồm giảm giá). Trả false (không trừ gì) nếu không đủ. */
export function payBuildCost(state: GameState, element: Element): boolean {
  const c = effectiveBuildCost(state, element);
  return payCost(state, element, c.linhThach, c.tinh);
}

/** Cộng phần thưởng khi giết quái: Linh Thạch + tinh đúng hệ của quái. */
export function addDrop(state: GameState, linhThach: number, element: Element, tinh: number): void {
  state.resources.linhThach += linhThach;
  state.resources.tinh[element] += tinh;
  state.stats.linhThachEarned += linhThach;
  state.stats.tinhEarned[element] += tinh;
}
