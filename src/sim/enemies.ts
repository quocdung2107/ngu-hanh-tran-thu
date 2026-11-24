import { AGGRO_RANGE, CENTER_ATTACK_RANGE } from '../config/balance';
import {
  BOSS_DMG_MUL, BOSS_HP_MUL, BOSS_REWARD_LINH_THACH, BOSS_REWARD_TINH,
  BOSS_SIZE_MUL, BOSS_SPEED_MUL, ENEMY_BASE, ENEMY_RANGED_RANGE, ENEMY_ROLES,
  GIAP_TOWER_SEEK_RANGE, HEAL_BASE, HEAL_INTERVAL, HEAL_RADIUS, type EnemyRole,
} from '../config/enemies';
import { getWaveDef, type SpawnKind } from '../config/waves';
import { damageHero } from './hero';
import { damageCenter, dist, slotPos, type Enemy, type GameState } from './state';

export function spawnEnemy(state: GameState, kind: SpawnKind = 'thuong'): void {
  const def = getWaveDef(state.wave, state.endless);
  const gate = state.gates[state.gateIdx % state.gates.length];
  state.gateIdx++;
  const isBoss = kind === 'boss';
  const role: EnemyRole = isBoss ? 'thuong' : kind;
  const rd = ENEMY_ROLES[role];
  const hp = ENEMY_BASE.hp * def.hpMul * state.map.enemyHpMul * rd.hpMul * (isBoss ? BOSS_HP_MUL : 1);
  const e: Enemy = {
    id: state.nextEnemyId++,
    element: state.waveElement,
    role, isBoss,
    x: gate.x, y: gate.y,
    hp, maxHp: hp,
    speed: ENEMY_BASE.speed * rd.speedMul * (isBoss ? BOSS_SPEED_MUL : 1),
    dmg: ENEMY_BASE.dmg * rd.dmgMul * (isBoss ? BOSS_DMG_MUL : 1),
    radius: ENEMY_BASE.radius * rd.radiusMul * (isBoss ? BOSS_SIZE_MUL : 1),
    rewardLt: isBoss ? BOSS_REWARD_LINH_THACH : Math.max(1, Math.round(ENEMY_BASE.rewardLinhThach * rd.rewardMul)),
    rewardTinh: isBoss ? BOSS_REWARD_TINH : Math.max(1, Math.round(ENEMY_BASE.rewardTinh * rd.rewardMul)),
    atkCd: 0, healCd: HEAL_INTERVAL,
    slowUntil: 0, slowPct: 0, rootUntil: 0, stunUntil: 0, rootCdUntil: 0,
    alive: true,
  };
  state.enemies.push(e);
}

function moveToward(e: Enemy, tx: number, ty: number, step: number): void {
  const d = dist(e.x, e.y, tx, ty);
  if (d <= 0) return;
  e.x += ((tx - e.x) / d) * step;
  e.y += ((ty - e.y) / d) * step;
}

function hitTower(state: GameState, e: Enemy, slot: number): void {
  const t = state.towers[slot];
  if (!t) return;
  t.hp -= e.dmg;
  if (t.hp <= 0) state.towers[slot] = null; // trụ bị phá → ngừng hoạt động
}

/** Quái Xa: đứng ở tầm ENEMY_RANGED_RANGE bắn trụ gần nhất hoặc trung tâm, không áp sát. */
function updateRanged(state: GameState, e: Enemy, frozen: boolean, dt: number): void {
  // tìm trụ gần nhất trong tầm bắn
  let towerSlot = -1; let towerDist = Infinity;
  for (const t of state.towers) {
    if (!t) continue;
    const p = slotPos(state.layout, t.slot);
    const d = dist(e.x, e.y, p.x, p.y);
    if (d < towerDist) { towerDist = d; towerSlot = t.slot; }
  }
  const centerDist = dist(e.x, e.y, 0, 0);
  const shootTower = towerSlot >= 0 && towerDist <= ENEMY_RANGED_RANGE && towerDist <= centerDist;
  const shootCenter = !shootTower && centerDist <= ENEMY_RANGED_RANGE;
  if (shootTower || shootCenter) {
    if (e.atkCd <= 0 && !frozen) {
      e.atkCd = 1 / ENEMY_BASE.atkPerSec;
      if (shootTower) {
        const p = slotPos(state.layout, towerSlot);
        state.projectiles.push({ x1: e.x, y1: e.y, x2: p.x, y2: p.y, element: e.element, ttl: 0.18, maxTtl: 0.18 });
        hitTower(state, e, towerSlot);
      } else {
        state.projectiles.push({ x1: e.x, y1: e.y, x2: 0, y2: 0, element: e.element, ttl: 0.18, maxTtl: 0.18 });
        damageCenter(state, e.dmg);
      }
    }
    return;
  }
  if (frozen) return;
  const slowMul = state.time < e.slowUntil ? 1 - e.slowPct : 1;
  moveToward(e, 0, 0, e.speed * slowMul * dt);
}

/** Quái Hồi: hồi máu cho đồng minh quanh (trừ chính mình và boss) theo nhịp HEAL_INTERVAL. */
function updateHealer(state: GameState, e: Enemy, dt: number): void {
  e.healCd -= dt;
  if (e.healCd > 0) return;
  e.healCd = HEAL_INTERVAL;
  const amount = HEAL_BASE * getWaveDef(state.wave, state.endless).hpMul;
  for (const a of state.enemies) {
    if (!a.alive || a.id === e.id || a.isBoss) continue;
    if (a.hp >= a.maxHp) continue;
    if (dist(e.x, e.y, a.x, a.y) > HEAL_RADIUS) continue;
    a.hp = Math.min(a.maxHp, a.hp + amount);
    state.floaters.push({ x: a.x, y: a.y, text: `+${Math.round(amount)}`, ttl: 0.6, color: '#7ee787' });
  }
}

/**
 * Quái đi về trung tâm (D4):
 * - Có trụ trong tầm bám AGGRO_RANGE → dừng đánh trụ đó (Giáp chủ động tìm trụ ở tầm xa hơn).
 * - Nhân vật chỉ bị nhắm khi ở trong tầm bám VÀ gần quái hơn trung tâm.
 * - Ngoài ra đi tiếp, tới gần tâm thì đánh trung tâm.
 * Vai trò Xa/Hồi có hành vi riêng ở trên.
 */
export function updateEnemies(state: GameState, dt: number): void {
  for (const e of state.enemies) {
    if (!e.alive) continue;
    e.atkCd -= dt;
    const frozen = state.time < e.rootUntil || state.time < e.stunUntil;
    const slowMul = state.time < e.slowUntil ? 1 - e.slowPct : 1;

    if (e.role === 'hoi') updateHealer(state, e, dt);
    if (e.role === 'xa') { updateRanged(state, e, frozen, dt); continue; }

    // Giáp: chủ động tiến về trụ gần nhất trong tầm tìm kiếm để phá trụ
    if (e.role === 'giap') {
      let slot = -1; let best = Infinity; let bp = { x: 0, y: 0 };
      for (const t of state.towers) {
        if (!t) continue;
        const p = slotPos(state.layout, t.slot);
        const d = dist(e.x, e.y, p.x, p.y);
        if (d < best) { best = d; slot = t.slot; bp = p; }
      }
      if (slot >= 0 && best <= GIAP_TOWER_SEEK_RANGE) {
        if (best <= AGGRO_RANGE) {
          if (e.atkCd <= 0 && !frozen) { e.atkCd = 1 / ENEMY_BASE.atkPerSec; hitTower(state, e, slot); }
        } else if (!frozen) {
          moveToward(e, bp.x, bp.y, e.speed * slowMul * dt);
        }
        continue;
      }
      // không có trụ trong tầm tìm kiếm → hành vi thường ở dưới
    }

    // tìm trụ gần nhất trong tầm bám
    let towerSlot = -1; let towerDist = Infinity;
    for (const t of state.towers) {
      if (!t) continue;
      const p = slotPos(state.layout, t.slot);
      const d = dist(e.x, e.y, p.x, p.y);
      if (d <= AGGRO_RANGE && d < towerDist) { towerDist = d; towerSlot = t.slot; }
    }
    const heroDist = dist(e.x, e.y, state.hero.x, state.hero.y);
    const centerDist = dist(e.x, e.y, 0, 0);
    const heroTargeted = heroDist <= AGGRO_RANGE && heroDist < centerDist && towerSlot < 0;

    if (towerSlot >= 0) {
      if (e.atkCd <= 0 && !frozen) { e.atkCd = 1 / ENEMY_BASE.atkPerSec; hitTower(state, e, towerSlot); }
      continue;
    }
    if (heroTargeted) {
      if (e.atkCd <= 0 && !frozen) { e.atkCd = 1 / ENEMY_BASE.atkPerSec; damageHero(state, e.dmg); }
      continue;
    }
    if (centerDist <= CENTER_ATTACK_RANGE) {
      if (e.atkCd <= 0 && !frozen) { e.atkCd = 1 / ENEMY_BASE.atkPerSec; damageCenter(state, e.dmg); }
      continue;
    }
    if (frozen) continue;
    moveToward(e, 0, 0, e.speed * slowMul * dt);
  }
}
