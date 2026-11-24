import {
  CENTER_HP, ELEMENTS, HERO, RING_COUNT, RING_RADII, SLOTS_PER_RING,
  START_LINH_THACH, START_TINH_PER_ELEMENT, type Element,
} from '../config/balance';

export type Phase = 'build' | 'combat' | 'won' | 'lost';

export interface Tower {
  slot: number;
  ring: number;
  element: Element;
  hp: number;
  maxHp: number;
  atkCd: number; // giây tới đòn đánh tiếp theo
}

export interface Enemy {
  id: number;
  element: Element;
  x: number; y: number;
  hp: number; maxHp: number;
  atkCd: number;
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
export interface Floater { x: number; y: number; text: string; ttl: number; color: string }

export interface RingState { cooldown: number } // giây còn lại của tuyệt kỹ AoE

export interface GameState {
  phase: Phase;
  time: number;
  rand: () => number;
  resources: { linhThach: number; tinh: Record<Element, number> };
  towers: (Tower | null)[]; // index = ring*5 + slotInRing
  center: { hp: number; maxHp: number };
  hero: {
    x: number; y: number; hp: number; mana: number;
    atkCd: number; shield: number;
    cooldowns: Record<string, number>;
  };
  unlockedSkills: string[]; // vĩnh viễn trong ván (D1)
  enemies: Enemy[];
  nextEnemyId: number;
  wave: number;              // đợt sắp đánh / đang đánh (1..5)
  waveElement: Element;      // hệ của đợt — chọn trước, hiện ở giai đoạn xây dựng
  toSpawn: number;
  spawnTimer: number;
  gateIdx: number;
  rings: RingState[];
  stats: { kills: number; linhThachEarned: number; tinhEarned: Record<Element, number> };
  projectiles: ProjectileFx[];
  aoeFx: AoeFx[];
  floaters: Floater[];
  message: string;
}

export function slotIndex(ring: number, slotInRing: number): number {
  return ring * SLOTS_PER_RING + slotInRing;
}

export function slotPos(index: number): { x: number; y: number; ring: number } {
  const ring = Math.floor(index / SLOTS_PER_RING);
  const i = index % SLOTS_PER_RING;
  const angle = (i / SLOTS_PER_RING) * Math.PI * 2 - Math.PI / 2 + ring * (Math.PI / SLOTS_PER_RING);
  const r = RING_RADII[ring];
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r, ring };
}

export function emptyTinh(): Record<Element, number> {
  return { kim: 0, moc: 0, thuy: 0, hoa: 0, tho: 0 };
}

export function pickWaveElement(rand: () => number): Element {
  return ELEMENTS[Math.floor(rand() * ELEMENTS.length) % ELEMENTS.length];
}

export function createGame(rand: () => number = Math.random): GameState {
  const tinh = emptyTinh();
  for (const e of ELEMENTS) tinh[e] = START_TINH_PER_ELEMENT;
  return {
    phase: 'build',
    time: 0,
    rand,
    resources: { linhThach: START_LINH_THACH, tinh },
    towers: new Array(RING_COUNT * SLOTS_PER_RING).fill(null),
    center: { hp: CENTER_HP, maxHp: CENTER_HP },
    hero: {
      x: 0.9, y: 0, hp: HERO.hp, mana: HERO.manaStart,
      atkCd: 0, shield: 0, cooldowns: {},
    },
    unlockedSkills: [],
    enemies: [],
    nextEnemyId: 1,
    wave: 1,
    waveElement: pickWaveElement(rand),
    toSpawn: 0,
    spawnTimer: 0,
    gateIdx: 0,
    rings: [{ cooldown: 0 }, { cooldown: 0 }],
    stats: { kills: 0, linhThachEarned: 0, tinhEarned: emptyTinh() },
    projectiles: [],
    aoeFx: [],
    floaters: [],
    message: '',
  };
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}
