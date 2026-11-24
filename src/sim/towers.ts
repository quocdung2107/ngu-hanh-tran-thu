import { TOWER_DEFS } from '../config/towers';
import type { Element } from '../config/balance';
import { payBuildCost } from './resources';
import { checkRecipes } from './formation';
import { dist, slotPos, type GameState, type Tower } from './state';

/** Xây trụ: chỉ ở giai đoạn xây dựng, ô trống, đủ tài nguyên. Phá KHÔNG hoàn tài nguyên. */
export function buildTower(state: GameState, slot: number, element: Element): boolean {
  if (state.phase !== 'build') return false;
  if (slot < 0 || slot >= state.towers.length) return false;
  if (state.towers[slot]) return false;
  if (!payBuildCost(state, element)) return false;
  const def = TOWER_DEFS[element];
  const tower: Tower = {
    slot, ring: Math.floor(slot / 5), element,
    hp: def.hp, maxHp: def.hp, atkCd: 0,
  };
  state.towers[slot] = tower;
  checkRecipes(state);
  return true;
}

/** Phá trụ do người chơi: chỉ ở giai đoạn xây dựng, hoàn trả 0 tài nguyên. */
export function destroyTowerByPlayer(state: GameState, slot: number): boolean {
  if (state.phase !== 'build') return false;
  if (!state.towers[slot]) return false;
  state.towers[slot] = null;
  return true;
}

/** Trụ bị quái phá trong chiến đấu. */
export function destroyTowerInCombat(state: GameState, slot: number): void {
  state.towers[slot] = null;
}

export function damageEnemy(state: GameState, enemyId: number, dmg: number): void {
  const e = state.enemies.find((x) => x.id === enemyId);
  if (e && e.alive) e.hp -= dmg;
}

/** Mỗi trụ tự tìm mục tiêu (quái tiến sâu nhất về trung tâm trong tầm) và tấn công độc lập. */
export function updateTowers(state: GameState, dt: number): void {
  for (const tower of state.towers) {
    if (!tower) continue;
    const def = TOWER_DEFS[tower.element];
    const pos = slotPos(tower.slot);
    tower.atkCd -= dt;
    // chọn quái còn sống trong tầm, ưu tiên quái gần trung tâm nhất
    let target = null as null | (typeof state.enemies)[number];
    let best = Infinity;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      if (dist(pos.x, pos.y, e.x, e.y) > def.range) continue;
      const dCenter = dist(e.x, e.y, 0, 0);
      if (dCenter < best) { best = dCenter; target = e; }
    }
    if (!target || tower.atkCd > 0) continue;
    tower.atkCd = 1 / def.atkPerSec;

    let dmg = def.dmg;
    let crit = false;
    if (def.critChance && state.rand() < def.critChance) { dmg *= def.critMul ?? 2; crit = true; }
    target.hp -= dmg;
    state.projectiles.push({
      x1: pos.x, y1: pos.y, x2: target.x, y2: target.y,
      element: tower.element, ttl: 0.18, maxTtl: 0.18,
    });
    state.floaters.push({
      x: target.x, y: target.y, text: crit ? `${Math.round(dmg)}!` : `${Math.round(dmg)}`,
      ttl: 0.55, color: crit ? '#ffd94a' : '#ffffff',
    });

    // hiệu ứng riêng theo hệ
    if (def.rootSec && state.time >= target.rootCdUntil) {
      target.rootUntil = state.time + def.rootSec;
      target.rootCdUntil = state.time + (def.rootInternalCd ?? 3);
    }
    if (def.slowPct && def.slowSec) {
      target.slowPct = Math.max(target.slowPct, def.slowPct);
      target.slowUntil = state.time + def.slowSec;
    }
    if (def.stunSec) target.stunUntil = Math.max(target.stunUntil, state.time + def.stunSec);
    if (def.splashRadius && def.splashMul) {
      for (const e of state.enemies) {
        if (!e.alive || e.id === target.id) continue;
        if (dist(target.x, target.y, e.x, e.y) <= def.splashRadius) e.hp -= dmg * def.splashMul;
      }
      state.aoeFx.push({ x: target.x, y: target.y, radius: def.splashRadius, ttl: 0.3, maxTtl: 0.3, color: '#e05a3a' });
    }
  }
}
