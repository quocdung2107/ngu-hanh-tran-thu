import {
  AOE_MIN_ENEMIES, AOE_MIN_TOWERS, AOE_POWER_SCALE, AOE_RADIUS_BONUS,
  ELEMENTS, KHAC, KHAC_ATTACKER_BONUS, KHAC_VICTIM_PENALTY, LINH_MACH_DMG_BONUS,
  SINH_BONUS_PER_NEIGHBOR, SINH_NEXT, type Element,
} from '../config/balance';
import { RECIPES, RING_ULTS } from '../config/recipes';
import { dist, slotIndex, tryStun, type GameState } from './state';

/** Số trụ đang sống của mỗi hệ trong một vòng (D1: chỉ tính trong vòng đó). */
export function countElementsInRing(state: GameState, ring: number): Record<Element, number> {
  const counts: Record<Element, number> = { kim: 0, moc: 0, thuy: 0, hoa: 0, tho: 0 };
  const n = state.layout.rings[ring].slots;
  for (let i = 0; i < n; i++) {
    const t = state.towers[slotIndex(state.layout, ring, i)];
    if (t) counts[t.element]++;
  }
  return counts;
}

export function livingTowersInRing(state: GameState, ring: number): number {
  return ELEMENTS.reduce((s, e) => s + countElementsInRing(state, ring)[e], 0);
}

// ===== E1: Tương sinh / tương khắc giữa các trụ kề nhau trong cùng vòng =====

export interface SynergyLink { a: number; b: number; kind: 'sinh' | 'khac' }

/** Phân loại cặp hai hệ kề nhau: 'sinh' nếu một hệ sinh hệ kia, 'khac' nếu một hệ khắc hệ kia. */
export function pairKind(a: Element, b: Element): 'sinh' | 'khac' | null {
  if (a === b) return null;
  if (SINH_NEXT[a] === b || SINH_NEXT[b] === a) return 'sinh';
  if (KHAC[a] === b || KHAC[b] === a) return 'khac';
  return null;
}

/** Mọi đường nối tương sinh/khắc hiện có (chỉ giữa trụ đang sống, kề nhau trong vòng). */
export function synergyLinks(state: GameState): SynergyLink[] {
  const links: SynergyLink[] = [];
  for (let ring = 0; ring < state.layout.rings.length; ring++) {
    const n = state.layout.rings[ring].slots;
    for (let i = 0; i < n; i++) {
      const a = slotIndex(state.layout, ring, i);
      const b = slotIndex(state.layout, ring, (i + 1) % n);
      const ta = state.towers[a], tb = state.towers[b];
      if (!ta || !tb) continue;
      const kind = pairKind(ta.element, tb.element);
      if (kind) links.push({ a, b, kind });
    }
  }
  return links;
}

/**
 * Hệ số sát thương của một trụ do tương sinh/khắc với hai trụ kề:
 * mỗi phía kề tương sinh +15%; khắc trụ kề +10%; bị trụ kề khắc −10%.
 * Tính lại mỗi lần dùng — trụ chết thì mất hiệu ứng ngay.
 */
export function towerSynergyMul(state: GameState, slot: number): number {
  const tower = state.towers[slot];
  if (!tower) return 1;
  let mul = 1;
  const ring = tower.ring;
  const n = state.layout.rings[ring].slots;
  const i = slot - slotIndex(state.layout, ring, 0);
  for (const j of [(i + 1) % n, (i + n - 1) % n]) {
    const other = state.towers[slotIndex(state.layout, ring, j)];
    if (!other) continue;
    const kind = pairKind(tower.element, other.element);
    if (kind === 'sinh') mul += SINH_BONUS_PER_NEIGHBOR;
    else if (kind === 'khac') {
      if (KHAC[tower.element] === other.element) mul += KHAC_ATTACKER_BONUS;
      else mul -= KHAC_VICTIM_PENALTY;
    }
  }
  return mul;
}

/** Hệ số Linh Mạch: trụ đứng trên ô Linh Mạch của đợt được +25% sát thương. */
export function towerLinhMachMul(state: GameState, slot: number): number {
  return state.linhMach.includes(slot) ? 1 + LINH_MACH_DMG_BONUS : 1;
}

export function recipeSatisfied(state: GameState, recipeId: string): boolean {
  const r = RECIPES.find((x) => x.id === recipeId);
  if (!r) return false;
  if (r.ring >= state.layout.rings.length) return false; // bản đồ không có vòng này
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

/** Hệ số sức mạnh tuyệt kỹ AoE theo số trụ sống (D2): 3→0.6, 4→0.8, ≥5→1.0, <3→0. */
export function aoePowerScale(living: number): number {
  return AOE_POWER_SCALE[living] ?? (living > 5 ? 1 : 0);
}

export function aoeRadius(state: GameState, ring: number): number {
  return state.layout.rings[ring].radius + AOE_RADIUS_BONUS;
}

/**
 * Cập nhật tuyệt kỹ AoE của từng vòng (D2):
 * - Dưới AOE_MIN_TOWERS trụ sống: cooldown ĐÓNG BĂNG (không giảm).
 * - Đủ trụ: cooldown giảm; về 0 và có ≥ AOE_MIN_ENEMIES quái trong bán kính vòng
 *   thì tự kích hoạt, gây dmg × hệ số theo số trụ sống, rồi đặt lại cooldown.
 */
export function updateRingUlts(state: GameState, dt: number): void {
  for (const ult of RING_ULTS) {
    if (ult.ring >= state.layout.rings.length) continue; // bản đồ không có vòng này
    const ring = state.rings[ult.ring];
    const living = livingTowersInRing(state, ult.ring);
    if (living < AOE_MIN_TOWERS) continue; // đóng băng cooldown
    if (ring.cooldown > 0) ring.cooldown = Math.max(0, ring.cooldown - dt);
    if (ring.cooldown > 0) continue;
    const radius = aoeRadius(state, ult.ring);
    const targets = state.enemies.filter((e) => e.alive && dist(e.x, e.y, 0, 0) <= radius);
    if (targets.length < AOE_MIN_ENEMIES) continue; // chờ đủ mục tiêu, cooldown giữ 0
    const dmg = ult.dmg * aoePowerScale(living);
    for (const e of targets) {
      e.hp -= dmg;
      if (ult.stunSec > 0) tryStun(state, e, ult.stunSec);
      state.floaters.push({ x: e.x, y: e.y, text: `-${Math.round(dmg)}`, ttl: 0.7, color: '#ffe27a' });
    }
    state.aoeFx.push({ x: 0, y: 0, radius, ttl: 0.55, maxTtl: 0.55, color: '#ffe27a' });
    state.sounds.push('aoe');
    // E4: bùng hạt vàng quanh vòng tuyệt kỹ
    for (let i = 0; i < 26; i++) {
      const a = state.rand() * Math.PI * 2;
      const sp = 1.2 + state.rand() * 2.8;
      const ttl = 0.5 + state.rand() * 0.4;
      state.particles.push({
        x: Math.cos(a) * radius * 0.7, y: Math.sin(a) * radius * 0.7,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        ttl, maxTtl: ttl, color: state.rand() < 0.5 ? '#ffe27a' : '#ffffff', size: 2.5,
      });
    }
    ring.cooldown = ult.cooldown * state.modifiers.ultCdMul; // Đạo Ngộ: hồi chiêu nhanh hơn
  }
}
