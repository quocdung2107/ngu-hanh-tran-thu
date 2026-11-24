import { TOWER_DEFS } from '../config/towers';
import type { Element } from '../config/balance';
import type { GameState } from './state';

export function canAfford(state: GameState, element: Element): boolean {
  const def = TOWER_DEFS[element];
  return state.resources.linhThach >= def.costLinhThach
    && state.resources.tinh[element] >= def.costTinh;
}

/** Trừ đúng chi phí xây trụ. Trả false (không trừ gì) nếu không đủ. */
export function payBuildCost(state: GameState, element: Element): boolean {
  if (!canAfford(state, element)) return false;
  const def = TOWER_DEFS[element];
  state.resources.linhThach -= def.costLinhThach;
  state.resources.tinh[element] -= def.costTinh;
  return true;
}

/** Cộng phần thưởng khi giết quái: Linh Thạch + tinh đúng hệ của quái. */
export function addDrop(state: GameState, linhThach: number, element: Element, tinh: number): void {
  state.resources.linhThach += linhThach;
  state.resources.tinh[element] += tinh;
  state.stats.linhThachEarned += linhThach;
  state.stats.tinhEarned[element] += tinh;
}
