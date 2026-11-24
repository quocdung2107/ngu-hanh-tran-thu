import { AGGRO_RANGE, CENTER_ATTACK_RANGE, GATES } from '../config/balance';
import { ENEMY_BASE } from '../config/enemies';
import { waveDef } from '../config/waves';
import { damageHero } from './hero';
import { dist, slotPos, type Enemy, type GameState } from './state';

export function spawnEnemy(state: GameState): void {
  const def = waveDef(state.wave);
  const gate = GATES[state.gateIdx % GATES.length];
  state.gateIdx++;
  const hp = ENEMY_BASE.hp * def.hpMul;
  const e: Enemy = {
    id: state.nextEnemyId++,
    element: state.waveElement,
    x: gate.x, y: gate.y,
    hp, maxHp: hp,
    atkCd: 0,
    slowUntil: 0, slowPct: 0, rootUntil: 0, stunUntil: 0, rootCdUntil: 0,
    alive: true,
  };
  state.enemies.push(e);
}

/**
 * Quái đi thẳng về trung tâm (D4):
 * - Có trụ trong tầm bám AGGRO_RANGE → dừng đánh trụ đó.
 * - Nhân vật chỉ bị nhắm khi ở trong tầm bám VÀ gần quái hơn trung tâm.
 * - Ngoài ra đi tiếp, tới gần tâm thì đánh trung tâm.
 */
export function updateEnemies(state: GameState, dt: number): void {
  for (const e of state.enemies) {
    if (!e.alive) continue;
    e.atkCd -= dt;
    const frozen = state.time < e.rootUntil || state.time < e.stunUntil;
    const slowMul = state.time < e.slowUntil ? 1 - e.slowPct : 1;

    // tìm trụ gần nhất trong tầm bám
    let towerSlot = -1; let towerDist = Infinity;
    for (const t of state.towers) {
      if (!t) continue;
      const p = slotPos(t.slot);
      const d = dist(e.x, e.y, p.x, p.y);
      if (d <= AGGRO_RANGE && d < towerDist) { towerDist = d; towerSlot = t.slot; }
    }
    const heroDist = dist(e.x, e.y, state.hero.x, state.hero.y);
    const centerDist = dist(e.x, e.y, 0, 0);
    const heroTargeted = heroDist <= AGGRO_RANGE && heroDist < centerDist && towerSlot < 0;

    if (towerSlot >= 0) {
      if (e.atkCd <= 0 && !frozen) {
        e.atkCd = 1 / ENEMY_BASE.atkPerSec;
        const t = state.towers[towerSlot];
        if (t) {
          t.hp -= ENEMY_BASE.dmg;
          if (t.hp <= 0) state.towers[towerSlot] = null; // trụ bị phá → ngừng hoạt động
        }
      }
      continue;
    }
    if (heroTargeted) {
      if (e.atkCd <= 0 && !frozen) {
        e.atkCd = 1 / ENEMY_BASE.atkPerSec;
        damageHero(state, ENEMY_BASE.dmg);
      }
      continue;
    }
    if (centerDist <= CENTER_ATTACK_RANGE) {
      if (e.atkCd <= 0 && !frozen) {
        e.atkCd = 1 / ENEMY_BASE.atkPerSec;
        state.center.hp -= ENEMY_BASE.dmg;
      }
      continue;
    }
    if (frozen) continue;
    const step = ENEMY_BASE.speed * slowMul * dt;
    e.x += (-e.x / centerDist) * step;
    e.y += (-e.y / centerDist) * step;
  }
}
