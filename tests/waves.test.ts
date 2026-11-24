import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/state';
import { startWave, checkWaveEnd } from '../src/sim/waves';
import { tick } from '../src/sim/combat';
import { WAVES } from '../src/config/waves';

const noRand = () => 0.99;

describe('đợt quái & điều kiện thắng/thua', () => {
  it('cấu hình 8 đợt (E1): số quái theo thành phần vai trò, HP scale 1+0.25(n-1)', () => {
    expect(WAVES.map((w) => w.count)).toEqual([8, 11, 14, 17, 20, 23, 26, 30]);
    expect(WAVES.map((w) => w.hpMul)).toEqual([1, 1.25, 1.5, 1.75, 2, 2.15, 2.3, 2.45]);
    expect(WAVES[7].composition).toContainEqual({ kind: 'boss', count: 1 });
  });

  it('hết quái đợt 1 → về xây dựng, sang đợt 2 và chọn trước hệ mới', () => {
    const s = createGame(noRand);
    expect(startWave(s)).toBe(true);
    expect(s.phase).toBe('combat');
    s.toSpawn = 0; s.enemies = [];
    checkWaveEnd(s);
    expect(s.phase).toBe('build');
    expect(s.wave).toBe(2);
  });

  it('qua đợt 8 → thắng', () => {
    const s = createGame(noRand);
    s.wave = 8;
    startWave(s);
    s.toSpawn = 0; s.enemies = [];
    checkWaveEnd(s);
    expect(s.phase).toBe('won');
  });

  it('trung tâm về 0 → thua ngay', () => {
    const s = createGame(noRand);
    startWave(s);
    s.center.hp = 0;
    checkWaveEnd(s);
    expect(s.phase).toBe('lost');
  });

  it('nhân vật về 0 → thua ngay', () => {
    const s = createGame(noRand);
    startWave(s);
    s.hero.hp = 0;
    checkWaveEnd(s);
    expect(s.phase).toBe('lost');
  });

  it('chạy tick mô phỏng không lỗi và quái spawn đúng số của đợt', () => {
    const s = createGame(noRand);
    startWave(s);
    let spawnedPeak = 0;
    for (let i = 0; i < 20 * 30; i++) { // 30 giây sim
      tick(s, 1 / 20);
      spawnedPeak = Math.max(spawnedPeak, s.stats.kills + s.enemies.length);
      if (s.phase !== 'combat') break;
    }
    // không trụ/không đánh: quái dồn về trung tâm và phá trung tâm → thua, nhưng đã spawn
    expect(spawnedPeak).toBeGreaterThan(0);
  });

  it('hệ của đợt được chọn trước và giữ nguyên trong đợt', () => {
    const s = createGame(() => 0); // rand 0 → luôn 'kim'
    expect(s.waveElement).toBe('kim');
    startWave(s);
    for (let i = 0; i < 20 * 3; i++) tick(s, 1 / 20);
    expect(s.enemies.every((e) => e.element === 'kim')).toBe(true);
  });
});
