import { TOTAL_WAVES, waveDef } from '../config/waves';
import { ENEMY_BASE } from '../config/enemies';
import { spawnEnemy } from './enemies';
import { addDrop } from './resources';
import { pickWaveElement, type GameState } from './state';

/** Bắt đầu đợt hiện tại (chỉ từ giai đoạn xây dựng). Hệ của đợt đã chọn trước. */
export function startWave(state: GameState): boolean {
  if (state.phase !== 'build') return false;
  const def = waveDef(state.wave);
  state.toSpawn = def.count;
  state.spawnTimer = 0;
  state.phase = 'combat';
  return true;
}

/** Xử lý quái chết: rơi Linh Thạch + tinh đúng hệ của quái, cộng thống kê. */
export function collectDeaths(state: GameState): void {
  for (const e of state.enemies) {
    if (e.alive && e.hp <= 0) {
      e.alive = false;
      state.stats.kills++;
      addDrop(state, ENEMY_BASE.rewardLinhThach, e.element, ENEMY_BASE.rewardTinh);
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
    if (state.wave >= TOTAL_WAVES) {
      state.phase = 'won';
      state.message = 'Đã giữ vững qua 5 đợt — thắng!';
    } else {
      state.wave++;
      state.waveElement = pickWaveElement(state.rand); // chọn trước hệ đợt sau
      state.phase = 'build';
      state.message = `Qua đợt! Chuẩn bị đợt ${state.wave}.`;
    }
  }
}

/** Spawn quái theo nhịp của đợt. */
export function updateSpawning(state: GameState, dt: number): void {
  if (state.toSpawn <= 0) return;
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnEnemy(state);
    state.toSpawn--;
    state.spawnTimer = waveDef(state.wave).spawnInterval;
  }
}
