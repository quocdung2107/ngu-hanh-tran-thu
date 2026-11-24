import { updateRingUlts } from './formation';
import { updateEnemies } from './enemies';
import { updateHero } from './hero';
import { updateTowers } from './towers';
import { checkWaveEnd, collectDeaths, updateSpawning } from './waves';
import type { GameState } from './state';

/** Một tick sim cố định. Chỉ chạy logic chiến đấu trong phase combat; hiệu ứng luôn trôi. */
export function tick(state: GameState, dt: number): void {
  state.time += dt;
  // hiệu ứng hình ảnh (thuần dữ liệu, render đọc)
  for (const p of state.projectiles) p.ttl -= dt;
  state.projectiles = state.projectiles.filter((p) => p.ttl > 0);
  for (const a of state.aoeFx) a.ttl -= dt;
  state.aoeFx = state.aoeFx.filter((a) => a.ttl > 0);
  for (const f of state.floaters) { f.ttl -= dt; f.y -= dt * 0.7; }
  state.floaters = state.floaters.filter((f) => f.ttl > 0);
  for (const pt of state.particles) { pt.ttl -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 0.92; pt.vy *= 0.92; }
  state.particles = state.particles.filter((pt) => pt.ttl > 0);

  if (state.phase !== 'combat') return;
  updateSpawning(state, dt);
  updateEnemies(state, dt);
  updateTowers(state, dt);
  updateHero(state, dt);
  updateRingUlts(state, dt);
  collectDeaths(state);
  checkWaveEnd(state);
}
