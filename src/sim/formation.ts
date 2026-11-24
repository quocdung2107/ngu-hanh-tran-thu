import {
  AOE_MIN_ENEMIES, AOE_MIN_TOWERS, AOE_POWER_SCALE, AOE_RADIUS_BONUS,
  ELEMENTS, RING_RADII, SLOTS_PER_RING, type Element,
} from '../config/balance';
import { RECIPES, RING_ULTS } from '../config/recipes';
import { dist, slotIndex, type GameState } from './state';

/** Số trụ đang sống của mỗi hệ trong một vòng (D1: chỉ tính trong vòng đó). */
export function countElementsInRing(state: GameState, ring: number): Record<Element, number> {
  const counts: Record<Element, number> = { kim: 0, moc: 0, thuy: 0, hoa: 0, tho: 0 };
  for (let i = 0; i < SLOTS_PER_RING; i++) {
    const t = state.towers[slotIndex(ring, i)];
    if (t) counts[t.element]++;
  }
  return counts;
}

export function livingTowersInRing(state: GameState, ring: number): number {
  return ELEMENTS.reduce((s, e) => s + countElementsInRing(state, ring)[e], 0);
}

export function recipeSatisfied(state: GameState, recipeId: string): boolean {
  const r = RECIPES.find((x) => x.id === recipeId);
  if (!r) return false;
  const counts = countElementsInRing(state, r.ring);
  return Object.entries(r.requires).every(([el, n]) => counts[el as Element] >= (n ?? 0));
}

/**
 * Kiểm tra công thức và mở khóa kỹ năng mới. Mở khóa là VĨNH VIỄN (D1):
 * trụ bị phá sau đó không làm mất kỹ năng đã học.
 * Trả về danh sách skillId vừa mở.
 */
export function checkRecipes(state: GameState): string[] {
  const newly: string[] = [];
  for (const r of RECIPES) {
    if (state.unlockedSkills.includes(r.skillId)) continue;
    if (recipeSatisfied(state, r.id)) {
      state.unlockedSkills.push(r.skillId);
      newly.push(r.skillId);
    }
  }
  return newly;
}

/** Hệ số sức mạnh tuyệt kỹ AoE theo số trụ sống (D2): 3→0.6, 4→0.8, 5→1.0, <3→0. */
export function aoePowerScale(living: number): number {
  return AOE_POWER_SCALE[living] ?? 0;
}

export function aoeRadius(ring: number): number {
  return RING_RADII[ring] + AOE_RADIUS_BONUS;
}

/**
 * Cập nhật tuyệt kỹ AoE của từng vòng (D2):
 * - Dưới AOE_MIN_TOWERS trụ sống: cooldown ĐÓNG BĂNG (không giảm).
 * - Đủ trụ: cooldown giảm; về 0 và có ≥ AOE_MIN_ENEMIES quái trong bán kính vòng
 *   thì tự kích hoạt, gây dmg × hệ số theo số trụ sống, rồi đặt lại cooldown.
 */
export function updateRingUlts(state: GameState, dt: number): void {
  for (const ult of RING_ULTS) {
    const ring = state.rings[ult.ring];
    const living = livingTowersInRing(state, ult.ring);
    if (living < AOE_MIN_TOWERS) continue; // đóng băng cooldown
    if (ring.cooldown > 0) ring.cooldown = Math.max(0, ring.cooldown - dt);
    if (ring.cooldown > 0) continue;
    const radius = aoeRadius(ult.ring);
    const targets = state.enemies.filter((e) => e.alive && dist(e.x, e.y, 0, 0) <= radius);
    if (targets.length < AOE_MIN_ENEMIES) continue; // chờ đủ mục tiêu, cooldown giữ 0
    const dmg = ult.dmg * aoePowerScale(living);
    for (const e of targets) {
      e.hp -= dmg;
      if (ult.stunSec > 0) e.stunUntil = Math.max(e.stunUntil, state.time + ult.stunSec);
      state.floaters.push({ x: e.x, y: e.y, text: `-${Math.round(dmg)}`, ttl: 0.7, color: '#ffe27a' });
    }
    state.aoeFx.push({ x: 0, y: 0, radius, ttl: 0.55, maxTtl: 0.55, color: '#ffe27a' });
    ring.cooldown = ult.cooldown;
  }
}
