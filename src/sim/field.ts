// E5 — Sim chế độ Dã Chiến: thuần TS, không DOM, tick cố định 20Hz (main gọi).
// Bản đồ 80×80, camera bám nhân vật, quái cùng cỡ nhân vật spawn thành bầy ngoài
// khung hình, rơi vật phẩm hút về nhân vật. Mọi con số ở src/config/field.ts.
import { ELEMENTS, type Element } from '../config/balance';
import {
  FIELD, FIELD_SKILL_BY_ID, packSizeAt, spawnDistance, spawnIntervalAt,
} from '../config/field';
import { dist, type AoeFx, type Floater, type Particle } from './state';

export type FieldPhase = 'running' | 'won' | 'lost';
export type FieldEnemyKind = 'normal' | 'elite' | 'boss';

export interface FieldEnemy {
  id: number;
  element: Element;
  kind: FieldEnemyKind;
  x: number; y: number;
  hp: number; maxHp: number;
  speed: number;
  dmg: number;
  size: number; // đường kính thân (đơn vị thế giới) — quái thường = cỡ nhân vật
  atkCd: number;
  slowUntil: number; slowPct: number;
  rootUntil: number;
  stunUntil: number;
  alive: boolean;
}

export interface FieldProjectile {
  x: number; y: number;
  vx: number; vy: number;
  targetId: number;
  dmg: number;
  crit: boolean;
  ttl: number;
}

export interface Pickup {
  id: number;
  kind: 'lt' | 'tinh';
  element: Element; // tinh: hệ của tinh; lt: hệ của quái rơi ra (chỉ để chọn màu)
  amount: number;
  x: number; y: number;
  magnet: boolean;
  bornAt: number;
}

export interface FieldHero {
  x: number; y: number;
  hp: number; maxHp: number;
  mana: number;
  atkCd: number;
  cooldowns: Record<string, number>;
  /** Hướng di chuyển mong muốn do người chơi giữ phím (main ghi mỗi frame, sim chuẩn hóa). */
  input: { x: number; y: number };
  /** Đích click-to-move (khi không giữ phím). */
  moveTarget: { x: number; y: number } | null;
}

export interface FieldState {
  phase: FieldPhase;
  time: number;    // tổng thời gian sim (kể cả sau khi kết thúc — cho hiệu ứng)
  elapsed: number; // thời gian sống sót trong ván
  rand: () => number;
  hero: FieldHero;
  camera: { x: number; y: number };
  enemies: FieldEnemy[];
  projectiles: FieldProjectile[];
  pickups: Pickup[];
  spawnTimer: number;
  bossSpawned: boolean;
  nextEnemyId: number;
  nextPickupId: number;
  stats: { kills: number; linhThach: number; tinh: Record<Element, number> };
  floaters: Floater[];
  particles: Particle[];
  aoeFx: AoeFx[];
  sounds: string[]; // hàng đợi sự kiện âm thanh như chế độ thủ trận
}

export function emptyFieldTinh(): Record<Element, number> {
  return { kim: 0, moc: 0, thuy: 0, hoa: 0, tho: 0 };
}

export function createFieldGame(rand: () => number = Math.random): FieldState {
  const cx = FIELD.worldW / 2, cy = FIELD.worldH / 2;
  return {
    phase: 'running',
    time: 0,
    elapsed: 0,
    rand,
    hero: {
      x: cx, y: cy, hp: FIELD.hero.hp, maxHp: FIELD.hero.hp, mana: FIELD.hero.manaStart,
      atkCd: 0, cooldowns: {}, input: { x: 0, y: 0 }, moveTarget: null,
    },
    camera: { x: cx, y: cy },
    enemies: [],
    projectiles: [],
    pickups: [],
    spawnTimer: 0.5, // bầy đầu tiên đến sớm để vào nhịp ngay
    bossSpawned: false,
    nextEnemyId: 1,
    nextPickupId: 1,
    stats: { kills: 0, linhThach: 0, tinh: emptyFieldTinh() },
    floaters: [],
    particles: [],
    aoeFx: [],
    sounds: [],
  };
}

export function aliveCount(state: FieldState): number {
  return state.enemies.length;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Đích camera: nhân vật, kẹp để khung nhìn không vượt biên bản đồ. */
export function cameraTarget(state: FieldState): { x: number; y: number } {
  return {
    x: clamp(state.hero.x, FIELD.viewW / 2, FIELD.worldW - FIELD.viewW / 2),
    y: clamp(state.hero.y, FIELD.viewH / 2, FIELD.worldH - FIELD.viewH / 2),
  };
}

/** Camera bám mượt (lerp) theo nhân vật + kẹp biên. */
export function updateCamera(state: FieldState, dt: number): void {
  const t = cameraTarget(state);
  const k = Math.min(1, FIELD.cameraLerp * dt);
  state.camera.x += (t.x - state.camera.x) * k;
  state.camera.y += (t.y - state.camera.y) * k;
  state.camera.x = clamp(state.camera.x, FIELD.viewW / 2, FIELD.worldW - FIELD.viewW / 2);
  state.camera.y = clamp(state.camera.y, FIELD.viewH / 2, FIELD.worldH - FIELD.viewH / 2);
}

/** Điểm (x,y) có nằm ngoài khung nhìn hiện tại không (theo hình chữ nhật thế giới của camera). */
export function isOutsideView(state: FieldState, x: number, y: number): boolean {
  return Math.abs(x - state.camera.x) > FIELD.viewW / 2 || Math.abs(y - state.camera.y) > FIELD.viewH / 2;
}

function spawnEnemyAt(state: FieldState, x: number, y: number, kind: FieldEnemyKind): void {
  const element = ELEMENTS[Math.floor(state.rand() * ELEMENTS.length) % ELEMENTS.length];
  const tier = Math.floor(state.elapsed / FIELD.spawn.tierSec);
  const hpMul = 1 + tier * 0.15;
  let size: number = FIELD.enemy.size, hp: number = FIELD.enemy.hp * hpMul, dmg: number = FIELD.enemy.dmg;
  let speed: number = FIELD.enemy.speed * (1 - FIELD.enemy.speedVariance / 2 + state.rand() * FIELD.enemy.speedVariance);
  if (kind === 'elite') {
    size = FIELD.elite.size; hp *= FIELD.elite.hpMul; dmg *= FIELD.elite.dmgMul; speed *= FIELD.elite.speedMul;
  } else if (kind === 'boss') {
    size = FIELD.boss.size; hp *= FIELD.boss.hpMul; dmg *= FIELD.boss.dmgMul; speed *= FIELD.boss.speedMul;
  }
  state.enemies.push({
    id: state.nextEnemyId++, element, kind, x, y,
    hp, maxHp: hp, speed, dmg, size,
    atkCd: 0, slowUntil: 0, slowPct: 0, rootUntil: 0, stunUntil: 0, alive: true,
  });
}

/** Thả một bầy quái quanh nhân vật ở ngoài khung hình (xoay góc nếu điểm bị kẹp biên vào trong khung). */
export function spawnPack(state: FieldState): void {
  const room = FIELD.maxAlive - aliveCount(state);
  if (room <= 0) return;
  const n = Math.min(packSizeAt(state.elapsed), room);
  const d0 = spawnDistance();
  const baseAngle = state.rand() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const want = baseAngle + (i / Math.max(1, n)) * Math.PI * 2 + (state.rand() - 0.5) * 0.5;
    let px = state.hero.x, py = state.hero.y;
    for (let attempt = 0; attempt < 8; attempt++) {
      const a = want + attempt * (Math.PI / 4);
      px = clamp(state.hero.x + Math.cos(a) * d0, 1, FIELD.worldW - 1);
      py = clamp(state.hero.y + Math.sin(a) * d0, 1, FIELD.worldH - 1);
      if (isOutsideView(state, px, py)) break;
    }
    let kind: FieldEnemyKind = 'normal';
    if (state.elapsed >= FIELD.elite.fromSec && state.rand() < FIELD.elite.chance) kind = 'elite';
    spawnEnemyAt(state, px, py, kind);
  }
}

function spawnBoss(state: FieldState): void {
  const a = state.rand() * Math.PI * 2;
  const d0 = spawnDistance();
  const px = clamp(state.hero.x + Math.cos(a) * d0, 1.5, FIELD.worldW - 1.5);
  const py = clamp(state.hero.y + Math.sin(a) * d0, 1.5, FIELD.worldH - 1.5);
  spawnEnemyAt(state, px, py, 'boss');
  state.sounds.push('waveStart');
}

/** Sát thương lên nhân vật dã chiến: giáp giảm theo công thức 50/(50+armor) như chế độ thủ trận. */
export function damageFieldHero(state: FieldState, rawDmg: number): void {
  state.hero.hp -= rawDmg * (50 / (50 + FIELD.hero.armor));
}

function dropPickups(state: FieldState, e: FieldEnemy): void {
  const mul = e.kind === 'elite' ? FIELD.elite.rewardMul : 1;
  const lt = e.kind === 'boss' ? FIELD.boss.rewardLinhThach : FIELD.enemy.rewardLinhThach * mul;
  const tinh = e.kind === 'boss' ? FIELD.boss.rewardTinh : FIELD.enemy.rewardTinh * mul;
  const s = FIELD.pickup.scatter;
  state.pickups.push({
    id: state.nextPickupId++, kind: 'lt', element: e.element, amount: lt,
    x: clamp(e.x + (state.rand() - 0.5) * s, 0.5, FIELD.worldW - 0.5),
    y: clamp(e.y + (state.rand() - 0.5) * s, 0.5, FIELD.worldH - 0.5),
    magnet: false, bornAt: state.time,
  });
  state.pickups.push({
    id: state.nextPickupId++, kind: 'tinh', element: e.element, amount: tinh,
    x: clamp(e.x + (state.rand() - 0.5) * s, 0.5, FIELD.worldW - 0.5),
    y: clamp(e.y + (state.rand() - 0.5) * s, 0.5, FIELD.worldH - 0.5),
    magnet: false, bornAt: state.time,
  });
}

function burst(state: FieldState, x: number, y: number, color: string, n = 6): void {
  for (let i = 0; i < n; i++) {
    const a = state.rand() * Math.PI * 2;
    const sp = 1 + state.rand() * 2;
    state.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      ttl: 0.4, maxTtl: 0.4, color, size: 2.5,
    });
  }
}

/** Dùng kỹ năng chủ động (phím 1/2/3): kiểm tra mana + cooldown như hệ kỹ năng hiện có. */
export function castFieldSkill(state: FieldState, skillId: string): boolean {
  const def = FIELD_SKILL_BY_ID[skillId];
  if (!def || state.phase !== 'running') return false;
  if ((state.hero.cooldowns[skillId] ?? 0) > 0) return false;
  if (state.hero.mana < def.manaCost) return false;

  let cx = state.hero.x, cy = state.hero.y;
  if (def.kind === 'swordRain') {
    // giáng xuống cụm quái đông nhất: chọn quái có nhiều đồng minh nhất trong bán kính kỹ năng
    let best: FieldEnemy | null = null; let bestCount = 0;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      if (dist(state.hero.x, state.hero.y, e.x, e.y) > FIELD.hero.range + def.radius + 4) continue;
      let c = 0;
      for (const o of state.enemies) if (o.alive && dist(e.x, e.y, o.x, o.y) <= def.radius) c++;
      if (c > bestCount) { bestCount = c; best = e; }
    }
    if (!best) return false; // không có cụm quái thì không tốn mana
    cx = best.x; cy = best.y;
  }

  state.hero.mana -= def.manaCost;
  state.hero.cooldowns[skillId] = def.cooldown;

  if (def.kind === 'heal') {
    state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + def.power);
    state.aoeFx.push({ x: cx, y: cy, radius: 1.1, ttl: 0.5, maxTtl: 0.5, color: '#58c472' });
    state.floaters.push({ x: cx, y: cy, text: `+${def.power}`, ttl: 0.7, color: '#7ee787' });
    state.sounds.push('skill');
    return true;
  }

  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (dist(cx, cy, e.x, e.y) > def.radius + e.size / 2) continue;
    e.hp -= def.power;
    state.floaters.push({ x: e.x, y: e.y, text: `-${def.power}`, ttl: 0.7, color: '#ffb37a' });
  }
  state.aoeFx.push({ x: cx, y: cy, radius: def.radius, ttl: 0.5, maxTtl: 0.5, color: def.kind === 'blast' ? '#ffd94a' : '#bfe3ff' });
  burst(state, cx, cy, def.kind === 'blast' ? '#ffd94a' : '#bfe3ff', 14);
  state.sounds.push(def.kind === 'blast' ? 'aoe' : 'skill');
  return true;
}

function updateHero(state: FieldState, dt: number): void {
  const h = state.hero;
  h.hp = Math.min(h.maxHp, h.hp + FIELD.hero.regenPerSec * dt);
  h.mana = Math.min(FIELD.hero.manaMax, h.mana + FIELD.hero.manaRegenPerSec * dt);
  for (const k of Object.keys(h.cooldowns)) h.cooldowns[k] = Math.max(0, h.cooldowns[k] - dt);
  h.atkCd -= dt;

  // di chuyển: phím giữ (input) ưu tiên hơn click-to-move
  const inp = h.input;
  const len = Math.hypot(inp.x, inp.y);
  if (len > 0.01) {
    h.x += (inp.x / len) * FIELD.hero.speed * dt;
    h.y += (inp.y / len) * FIELD.hero.speed * dt;
    h.moveTarget = null;
  } else if (h.moveTarget) {
    const d = dist(h.x, h.y, h.moveTarget.x, h.moveTarget.y);
    if (d < 0.2) h.moveTarget = null;
    else {
      const step = Math.min(d, FIELD.hero.speed * dt);
      h.x += ((h.moveTarget.x - h.x) / d) * step;
      h.y += ((h.moveTarget.y - h.y) / d) * step;
    }
  }
  const m = FIELD.hero.size / 2;
  h.x = clamp(h.x, m, FIELD.worldW - m);
  h.y = clamp(h.y, m, FIELD.worldH - m);

  // tự động tấn công: loạt đạn nhiều tia vào các quái gần nhất trong tầm
  if (h.atkCd > 0) return;
  const targets = state.enemies
    .filter((e) => e.alive && dist(h.x, h.y, e.x, e.y) <= FIELD.hero.range)
    .sort((a, b) => dist(h.x, h.y, a.x, a.y) - dist(h.x, h.y, b.x, b.y));
  if (targets.length === 0) { h.atkCd = 0.12; return; }
  h.atkCd = 1 / FIELD.hero.atkPerSec;
  state.sounds.push('attack:hero');
  const n = FIELD.hero.projectilesPerVolley;
  for (let i = 0; i < n; i++) {
    const t = targets[i % targets.length];
    const base = Math.atan2(t.y - h.y, t.x - h.x);
    const spread = (i - (n - 1) / 2) * 0.07; // tỏa quạt nhẹ như ảnh tham chiếu
    const a = base + spread;
    state.projectiles.push({
      x: h.x, y: h.y,
      vx: Math.cos(a) * FIELD.hero.projectileSpeed,
      vy: Math.sin(a) * FIELD.hero.projectileSpeed,
      targetId: t.id,
      dmg: FIELD.hero.dmg,
      crit: state.rand() < FIELD.hero.critChance,
      ttl: 1.2,
    });
  }
}

function updateProjectiles(state: FieldState, dt: number): void {
  const speed = FIELD.hero.projectileSpeed;
  for (const p of state.projectiles) {
    p.ttl -= dt;
    const t = state.enemies.find((e) => e.id === p.targetId && e.alive);
    if (t) {
      const a = Math.atan2(t.y - p.y, t.x - p.x);
      p.vx = Math.cos(a) * speed; p.vy = Math.sin(a) * speed;
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.ttl <= 0) continue;
    for (const e of state.enemies) {
      if (!e.alive || e.hp <= 0) continue;
      if (dist(p.x, p.y, e.x, e.y) <= e.size / 2 + 0.18) {
        const dmg = p.dmg * (p.crit ? FIELD.hero.critMul : 1);
        e.hp -= dmg;
        state.floaters.push({
          x: e.x, y: e.y, text: `${Math.round(dmg)}`, ttl: 0.5,
          color: p.crit ? '#ffd94a' : '#bfe3ff',
        });
        p.ttl = 0;
        break;
      }
    }
  }
  state.projectiles = state.projectiles.filter((p) => p.ttl > 0 && p.x >= 0 && p.x <= FIELD.worldW && p.y >= 0 && p.y <= FIELD.worldH);
}

function updateEnemies(state: FieldState, dt: number): void {
  const h = state.hero;
  const heroR = FIELD.hero.size / 2;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    e.atkCd -= dt;
    const frozen = state.time < e.rootUntil || state.time < e.stunUntil;
    if (frozen) continue;
    const slowMul = state.time < e.slowUntil ? 1 - e.slowPct : 1;
    const d = dist(e.x, e.y, h.x, h.y);
    const contact = e.size / 2 + heroR + FIELD.enemy.attackGap;
    if (d > contact) {
      const step = e.speed * slowMul * dt;
      e.x += ((h.x - e.x) / d) * step;
      e.y += ((h.y - e.y) / d) * step;
    } else if (e.atkCd <= 0) {
      e.atkCd = 1 / FIELD.enemy.atkPerSec;
      damageFieldHero(state, e.dmg);
      state.floaters.push({ x: h.x, y: h.y, text: `-${Math.round(e.dmg)}`, ttl: 0.5, color: '#ff9d94' });
    }
  }
  // tách bầy: hai quái chồng nhau thì đẩy ra (O(n²) nhưng n ≤ 120 nên rẻ)
  const es = state.enemies;
  for (let i = 0; i < es.length; i++) {
    if (!es[i].alive) continue;
    for (let j = i + 1; j < es.length; j++) {
      if (!es[j].alive) continue;
      const a = es[i], b = es[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = (a.size / 2 + b.size / 2) * 0.9;
      if (d > 0.001 && d < min) {
        const push = ((min - d) / 2) * 0.6;
        const ux = dx / d, uy = dy / d;
        a.x -= ux * push; a.y -= uy * push;
        b.x += ux * push; b.y += uy * push;
      }
    }
  }
}

function updatePickups(state: FieldState, dt: number): void {
  const h = state.hero;
  for (const p of state.pickups) {
    const d = dist(p.x, p.y, h.x, h.y);
    if (!p.magnet && d <= FIELD.pickup.magnetRadius) p.magnet = true;
    if (p.magnet && d > 0.001) {
      const step = Math.min(d, FIELD.pickup.magnetSpeed * dt);
      p.x += ((h.x - p.x) / d) * step;
      p.y += ((h.y - p.y) / d) * step;
    }
  }
  state.pickups = state.pickups.filter((p) => {
    if (dist(p.x, p.y, h.x, h.y) > FIELD.pickup.collectRadius) return true;
    if (p.kind === 'lt') state.stats.linhThach += p.amount;
    else state.stats.tinh[p.element] += p.amount;
    state.sounds.push('pickup');
    return false;
  });
}

function collectFieldDeaths(state: FieldState): void {
  for (const e of state.enemies) {
    if (e.alive && e.hp <= 0) {
      e.alive = false;
      state.stats.kills++;
      state.sounds.push('death');
      burst(state, e.x, e.y, '#ffffff', 5);
      dropPickups(state, e);
    }
  }
  state.enemies = state.enemies.filter((e) => e.alive);
}

function decayFx(state: FieldState, dt: number): void {
  for (const a of state.aoeFx) a.ttl -= dt;
  state.aoeFx = state.aoeFx.filter((a) => a.ttl > 0);
  for (const f of state.floaters) { f.ttl -= dt; f.y -= dt * 0.7; }
  state.floaters = state.floaters.filter((f) => f.ttl > 0);
  for (const pt of state.particles) { pt.ttl -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 0.92; pt.vy *= 0.92; }
  state.particles = state.particles.filter((pt) => pt.ttl > 0);
}

/** Một tick sim Dã Chiến (dt cố định 1/TICK_RATE từ main). */
export function tickField(state: FieldState, dt: number): void {
  state.time += dt;
  decayFx(state, dt);
  updateCamera(state, dt);
  if (state.phase !== 'running') return;
  state.elapsed += dt;

  // spawn bầy + boss phút 4
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnPack(state);
    state.spawnTimer = spawnIntervalAt(state.elapsed);
  }
  if (!state.bossSpawned && state.elapsed >= FIELD.boss.atSec) {
    state.bossSpawned = true;
    spawnBoss(state);
  }

  updateHero(state, dt);
  updateProjectiles(state, dt);
  updateEnemies(state, dt);
  collectFieldDeaths(state);
  updatePickups(state, dt);

  if (state.hero.hp <= 0) {
    state.hero.hp = 0;
    state.phase = 'lost';
    state.sounds.push('lose');
  } else if (state.elapsed >= FIELD.survivalTime) {
    state.phase = 'won';
    state.sounds.push('win');
  }
}
