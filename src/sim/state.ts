import {
  CENTER_HP, ELEMENTS, HERO, LINH_MACH_MAX, LINH_MACH_MIN,
  START_LINH_THACH, START_TINH_PER_ELEMENT, type Element,
} from '../config/balance';
import { BOSS_CC_CYCLE, type EnemyRole } from '../config/enemies';
import { MAPS, gatesOf, type MapDef, type RingLayoutDef } from '../config/maps';
import type { SpawnKind } from '../config/waves';
import { noModifiers, type RunModifiers } from './daongo';

// ===== E2: Layout trận suy từ bản đồ (số vòng / số ô mỗi vòng không còn cố định) =====
export interface Layout {
  rings: RingLayoutDef[];
  offsets: number[]; // chỉ số ô bắt đầu của mỗi vòng
  totalSlots: number;
}

export function layoutOf(map: MapDef): Layout {
  const offsets: number[] = [];
  let total = 0;
  for (const r of map.rings) { offsets.push(total); total += r.slots; }
  return { rings: map.rings, offsets, totalSlots: total };
}

export function slotIndex(layout: Layout, ring: number, slotInRing: number): number {
  return layout.offsets[ring] + slotInRing;
}

export function slotPos(layout: Layout, index: number): { x: number; y: number; ring: number; slotInRing: number } {
  let ring = 0;
  while (ring < layout.rings.length - 1 && index >= layout.offsets[ring + 1]) ring++;
  const i = index - layout.offsets[ring];
  const def = layout.rings[ring];
  const angle = (i / def.slots) * Math.PI * 2 - Math.PI / 2 + ring * (Math.PI / def.slots);
  return { x: Math.cos(angle) * def.radius, y: Math.sin(angle) * def.radius, ring, slotInRing: i };
}

export type Phase = 'build' | 'combat' | 'won' | 'lost';

export interface Tower {
  slot: number;
  ring: number;
  element: Element;
  level: number; // E1: cấp trụ 1..3
  hp: number;
  maxHp: number;
  atkCd: number; // giây tới đòn đánh tiếp theo
}

export interface Enemy {
  id: number;
  element: Element;
  role: EnemyRole;
  isBoss: boolean;
  x: number; y: number;
  hp: number; maxHp: number;
  speed: number; // tốc độ đã tính theo vai trò
  dmg: number;   // sát thương mỗi đòn đã tính theo vai trò
  radius: number;
  rewardLt: number; rewardTinh: number; // phần thưởng rơi khi chết
  atkCd: number;
  healCd: number; // quái Hồi: giây tới lần hồi máu tiếp theo
  slowUntil: number; slowPct: number;
  rootUntil: number;
  stunUntil: number;
  rootCdUntil: number; // cooldown nội bộ chống trói liên tục (Mộc)
  alive: boolean;
}

export interface ProjectileFx {
  x1: number; y1: number; x2: number; y2: number;
  element: Element | 'hero' | 'skill';
  ttl: number; maxTtl: number;
}
export interface AoeFx { x: number; y: number; radius: number; ttl: number; maxTtl: number; color: string }
export interface Particle { x: number; y: number; vx: number; vy: number; ttl: number; maxTtl: number; color: string; size: number }
export interface Floater { x: number; y: number; text: string; ttl: number; color: string }

export interface RingState { cooldown: number } // giây còn lại của tuyệt kỹ AoE

export interface GameState {
  phase: Phase;
  time: number;
  rand: () => number;
  map: MapDef;
  layout: Layout;
  gates: Array<{ x: number; y: number; name: string }>;
  endless: boolean;               // E3: chế độ Vô Tận (không có đợt cuối)
  modifiers: RunModifiers;        // E3: hiệu ứng Đạo Ngộ áp vào ván
  clickToMove: boolean;           // E3: bật điều khiển di chuyển bằng click
  heroMoveTarget: { x: number; y: number } | null;
  endlessRecord: number;          // E3: kỷ lục Vô Tận của bản đồ khi vào ván
  resources: { linhThach: number; tinh: Record<Element, number> };
  towers: (Tower | null)[]; // index theo layout (xem slotIndex/slotPos)
  center: { hp: number; maxHp: number; shieldHp: number; maxShieldHp: number };
  hero: {
    x: number; y: number; hp: number; mana: number;
    atkCd: number; shield: number;
    cooldowns: Record<string, number>;
  };
  unlockedSkills: string[]; // vĩnh viễn trong ván (D1)
  enemies: Enemy[];
  nextEnemyId: number;
  wave: number;              // đợt sắp đánh / đang đánh (1..8)
  waveElement: Element;      // hệ của đợt — chọn trước, hiện ở giai đoạn xây dựng
  toSpawn: number;
  spawnQueue: SpawnKind[];   // E1: hàng đợi loại quái sẽ spawn của đợt
  linhMach: number[];        // E1: các ô Linh Mạch của đợt hiện tại (chỉ số ô)
  spawnTimer: number;
  gateIdx: number;
  rings: RingState[];
  stats: { kills: number; linhThachEarned: number; tinhEarned: Record<Element, number> };
  projectiles: ProjectileFx[];
  aoeFx: AoeFx[];
  particles: Particle[];
  sounds: string[];          // E4: hàng đợi sự kiện âm thanh, tầng UI đọc và phát
  lastCenterHitAt: number;   // E4: thời điểm trung tâm bị đánh gần nhất (rung màn hình)
  floaters: Floater[];
  message: string;
}

export function emptyTinh(): Record<Element, number> {
  return { kim: 0, moc: 0, thuy: 0, hoa: 0, tho: 0 };
}

export function pickWaveElement(rand: () => number): Element {
  return ELEMENTS[Math.floor(rand() * ELEMENTS.length) % ELEMENTS.length];
}

/** E1: chọn ngẫu nhiên 1–2 ô Linh Mạch cho đợt (xáo trộn Fisher–Yates một phần). `extra` = cộng thêm từ Đạo Ngộ. */
export function rollLinhMach(rand: () => number, totalSlots: number, extra = 0): number[] {
  const count = Math.min(totalSlots, LINH_MACH_MIN + Math.floor(rand() * (LINH_MACH_MAX - LINH_MACH_MIN + 1)) + extra);
  const idx = Array.from({ length: totalSlots }, (_, i) => i);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rand() * (totalSlots - i)) % Math.max(1, totalSlots - i);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, count).sort((a, b) => a - b);
}

/** Sát thương vào trung tâm: lớp khiên ngoài (bản đồ 3) hứng trước, cạn khiên mới trừ HP chính. */
export function damageCenter(state: GameState, dmg: number): void {
  state.lastCenterHitAt = state.time;
  state.sounds.push('centerHit');
  let rest = dmg;
  if (state.center.shieldHp > 0) {
    const absorbed = Math.min(state.center.shieldHp, rest);
    state.center.shieldHp -= absorbed;
    rest -= absorbed;
  }
  state.center.hp -= rest;
}

// ===== E1: Boss miễn trói/choáng 50% thời gian =====

/** Boss miễn trói/choáng trong nửa đầu mỗi chu kỳ BOSS_CC_CYCLE giây. */
export function bossCcImmune(time: number): boolean {
  return (time % BOSS_CC_CYCLE) < BOSS_CC_CYCLE / 2;
}

/** Áp hiệu ứng trói — boss đang trong pha miễn nhiễm thì bỏ qua. */
export function tryRoot(state: GameState, e: Enemy, sec: number): void {
  if (e.isBoss && bossCcImmune(state.time)) return;
  e.rootUntil = Math.max(e.rootUntil, state.time + sec);
}

/** Áp hiệu ứng choáng — boss đang trong pha miễn nhiễm thì bỏ qua. */
export function tryStun(state: GameState, e: Enemy, sec: number): void {
  if (e.isBoss && bossCcImmune(state.time)) return;
  e.stunUntil = Math.max(e.stunUntil, state.time + sec);
}

export interface CreateGameOptions {
  endless?: boolean;
  modifiers?: RunModifiers;
  clickToMove?: boolean;
  endlessRecord?: number;
}

export function createGame(rand: () => number = Math.random, map: MapDef = MAPS[0], opts: CreateGameOptions = {}): GameState {
  const modifiers = opts.modifiers ?? noModifiers();
  const tinh = emptyTinh();
  for (const e of ELEMENTS) tinh[e] = START_TINH_PER_ELEMENT + modifiers.startTinhBonus;
  const layout = layoutOf(map);
  const centerMax = CENTER_HP + modifiers.centerHpBonus;
  const state: GameState = {
    phase: 'build',
    time: 0,
    rand,
    map,
    layout,
    gates: gatesOf(map),
    endless: opts.endless ?? false,
    modifiers,
    clickToMove: opts.clickToMove ?? false,
    heroMoveTarget: null,
    endlessRecord: opts.endlessRecord ?? 0,
    resources: { linhThach: START_LINH_THACH + modifiers.startLtBonus, tinh },
    towers: new Array(layout.totalSlots).fill(null),
    center: {
      hp: centerMax, maxHp: centerMax,
      shieldHp: map.centerLayers >= 2 ? map.centerShieldHp : 0,
      maxShieldHp: map.centerLayers >= 2 ? map.centerShieldHp : 0,
    },
    hero: {
      x: 0.9, y: 0, hp: HERO.hp + modifiers.heroMaxHpBonus, mana: HERO.manaStart,
      atkCd: 0, shield: 0, cooldowns: {},
    },
    unlockedSkills: [],
    enemies: [],
    nextEnemyId: 1,
    wave: 1,
    waveElement: pickWaveElement(rand),
    toSpawn: 0,
    spawnQueue: [],
    linhMach: [],
    spawnTimer: 0,
    gateIdx: 0,
    rings: map.rings.map(() => ({ cooldown: 0 })),
    stats: { kills: 0, linhThachEarned: 0, tinhEarned: emptyTinh() },
    projectiles: [],
    aoeFx: [],
    particles: [],
    sounds: [],
    lastCenterHitAt: -Infinity,
    floaters: [],
    message: '',
  };
  state.linhMach = rollLinhMach(rand, state.towers.length, modifiers.extraLinhMach);
  return state;
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}
