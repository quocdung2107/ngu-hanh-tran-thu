import { getWaveDef, spawnPlan } from '../config/waves';
import { spawnEnemy } from './enemies';
import { addDrop } from './resources';
import { pickWaveElement, rollLinhMach, type GameState } from './state';

/** Bắt đầu đợt hiện tại (chỉ từ giai đoạn xây dựng). Hệ của đợt đã chọn trước. */
export function startWave(state: GameState): boolean {
  if (state.phase !== 'build') return false;
  const def = getWaveDef(state.wave, state.endless);
  state.spawnQueue = spawnPlan(def);
  state.toSpawn = state.spawnQueue.length;
  state.spawnTimer = 0;
  state.phase = 'combat';
  return true;
}

/** Xử lý quái chết: rơi Linh Thạch + tinh đúng hệ của quái (theo vai trò/boss), cộng thống kê. */
export function collectDeaths(state: GameState): void {
  for (const e of state.enemies) {
    if (e.alive && e.hp <= 0) {
      e.alive = false;
      state.sounds.push('death');
      state.stats.kills++;
      addDrop(state, e.rewardLt, e.element, e.rewardTinh);
    }
  }
  state.enemies = state.enemies.filter((e) => e.alive);
}

/** Kiểm tra kết thúc đợt / thắng / thua. Trả về phase mới nếu đổi. */
export function checkWaveEnd(state: GameState): void {
  if (state.phase !== 'combat') return;
  if (state.center.hp <= 0 || state.hero.hp <= 0) {
    state.center.hp = Math.max(0, state.center.hp);
    state.hero.hp = Math.max(0, state.hero.hp);
    state.phase = 'lost';
    state.message = state.center.hp <= 0 ? 'Trung tâm trận pháp đã bị phá hủy!' : 'Nhân vật đã tử trận!';
    return;
  }
  if (state.toSpawn <= 0 && state.enemies.length === 0) {
    if (!state.endless && state.wave >= state.map.waves) {
      state.phase = 'won';
      state.message = `Đã giữ vững qua ${state.map.waves} đợt — thắng ${state.map.name}!`;
    } else {
      state.wave++;
      state.waveElement = pickWaveElement(state.rand); // chọn trước hệ đợt sau
      state.linhMach = rollLinhMach(state.rand, state.towers.length, state.modifiers.extraLinhMach); // Linh Mạch mới cho đợt sau
      state.phase = 'build';
      state.message = `Qua đợt! Chuẩn bị đợt ${state.wave}.`;
    }
  }
}

/** Spawn quái theo nhịp của đợt, theo hàng đợi vai trò đã lập khi bắt đầu đợt. */
export function updateSpawning(state: GameState, dt: number): void {
  if (state.toSpawn <= 0) return;
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    const kind = state.spawnQueue.shift() ?? 'thuong';
    spawnEnemy(state, kind);
    state.toSpawn--;
    state.spawnTimer = getWaveDef(state.wave, state.endless).spawnInterval;
  }
}
