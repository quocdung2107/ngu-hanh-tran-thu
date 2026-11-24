import type { Element } from '../config/balance';
import { buildTower, upgradeTower } from './towers';
import type { GameState } from './state';

// E2 — Mã trận hình dạng văn bản để lưu/chia sẻ: "NH1.<mapId>.<thân mã>".
// Thân mã: mỗi ô 2 ký tự — ".." nếu trống, hoặc <chữ cái hệ><chữ số cấp>.
// Hệ: K=Kim, M=Mộc, W=Thủy (Water), F=Hỏa (Fire), E=Thổ (Earth).
const EL_TO_CODE: Record<Element, string> = { kim: 'K', moc: 'M', thuy: 'W', hoa: 'F', tho: 'E' };
const CODE_TO_EL: Record<string, Element> = { K: 'kim', M: 'moc', W: 'thuy', F: 'hoa', E: 'tho' };

export interface DecodedFormation {
  mapId: string;
  slots: Array<{ element: Element; level: number } | null>;
}

export function encodeFormation(state: GameState): string {
  const body = state.towers.map((t) => (t ? EL_TO_CODE[t.element] + String(t.level) : '..')).join('');
  return `NH1.${state.map.id}.${body}`;
}

export function decodeFormation(code: string): DecodedFormation | null {
  // Thân mã chứa ký tự '.' (ô trống) nên chỉ tách ở 2 dấu chấm đầu tiên.
  const trimmed = code.trim();
  const first = trimmed.indexOf('.');
  const second = trimmed.indexOf('.', first + 1);
  if (first < 0 || second < 0 || trimmed.slice(0, first) !== 'NH1') return null;
  const mapId = trimmed.slice(first + 1, second);
  const body = trimmed.slice(second + 1);
  if (!mapId || body.length === 0 || body.length % 2 !== 0) return null;
  const slots: DecodedFormation['slots'] = [];
  for (let i = 0; i < body.length; i += 2) {
    const pair = body.slice(i, i + 2);
    if (pair === '..') { slots.push(null); continue; }
    const element = CODE_TO_EL[pair[0]];
    const level = Number(pair[1]);
    if (!element || ![1, 2, 3].includes(level)) return null;
    slots.push({ element, level });
  }
  return { mapId, slots };
}

export interface ApplyReport {
  ok: boolean;
  reason?: string;
  placed: number;   // số trụ đã xây được
  skipped: number;  // số trụ trong mã không xây được (thiếu tài nguyên / lệch bản đồ)
  upgraded: number; // số lần nâng cấp thành công
}

/**
 * Dựng lại trận từ mã (chỉ ở giai đoạn xây dựng, đúng bản đồ của mã):
 * phá toàn bộ trụ hiện tại (không hoàn tài nguyên), rồi xây/nâng theo mã
 * trong khả năng tài nguyên — thiếu thì bỏ qua trụ đó và báo cáo.
 */
export function applyFormationCode(state: GameState, code: string): ApplyReport {
  const fail = (reason: string): ApplyReport => ({ ok: false, reason, placed: 0, skipped: 0, upgraded: 0 });
  if (state.phase !== 'build') return fail('Chỉ nhập mã ở giai đoạn xây dựng.');
  const decoded = decodeFormation(code);
  if (!decoded) return fail('Mã trận hình không hợp lệ.');
  if (decoded.mapId !== state.map.id) return fail(`Mã này dành cho bản đồ khác (${decoded.mapId}).`);
  if (decoded.slots.length !== state.towers.length) return fail('Mã không khớp số ô của bản đồ này.');

  for (let i = 0; i < state.towers.length; i++) state.towers[i] = null;
  let placed = 0, skipped = 0, upgraded = 0;
  decoded.slots.forEach((want, slot) => {
    if (!want) return;
    if (!buildTower(state, slot, want.element)) { skipped++; return; }
    placed++;
    for (let lv = 1; lv < want.level; lv++) {
      if (upgradeTower(state, slot)) upgraded++;
      else break;
    }
  });
  return { ok: true, placed, skipped, upgraded };
}
