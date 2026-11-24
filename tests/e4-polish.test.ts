import { describe, expect, it } from 'vitest';
import { SoundEngine } from '../src/ui/audio';
import { createGame, damageCenter } from '../src/sim/state';
import { buildTower } from '../src/sim/towers';
import { updateRingUlts } from '../src/sim/formation';
import type { Element } from '../src/config/balance';

const noRand = () => 0.42;

describe('E4 — âm thanh WebAudio tổng hợp', () => {
  it('play/setMuted/setVolume không lỗi khi môi trường không có WebAudio (node)', () => {
    const eng = new SoundEngine();
    for (const key of ['attack:kim', 'attack:moc', 'attack:thuy', 'attack:hoa', 'attack:tho', 'attack:hero', 'aoe', 'death', 'centerHit', 'build', 'destroy', 'upgrade', 'skill', 'waveStart', 'win', 'lose']) {
      expect(() => eng.play(key)).not.toThrow();
    }
    expect(() => { eng.setMuted(true); eng.setVolume(0.3); eng.unlock(); }).not.toThrow();
    expect(eng.muted).toBe(true);
    expect(eng.volume).toBeCloseTo(0.3);
  });
});

describe('E4 — hạt hiệu ứng & rung màn hình', () => {
  it('tuyệt kỹ nổ: sinh hạt + đẩy sự kiện âm thanh aoe', () => {
    const s = createGame(noRand);
    s.resources.linhThach = 100000;
    for (const k of Object.keys(s.resources.tinh) as Element[]) s.resources.tinh[k] = 1000;
    buildTower(s, 0, 'kim'); buildTower(s, 1, 'moc'); buildTower(s, 2, 'thuy');
    for (let i = 0; i < 3; i++) s.enemies.push({
      id: s.nextEnemyId++, element: 'hoa', role: 'thuong', isBoss: false, x: 1, y: 0, hp: 500, maxHp: 500,
      speed: 0.55, dmg: 6, radius: 0.32, rewardLt: 6, rewardTinh: 2, atkCd: 0, healCd: 0,
      slowUntil: 0, slowPct: 0, rootUntil: 0, stunUntil: 0, rootCdUntil: 0, alive: true,
    });
    s.rings[0].cooldown = 0;
    updateRingUlts(s, 0.1);
    expect(s.particles.length).toBeGreaterThan(0);
    expect(s.sounds).toContain('aoe');
  });

  it('trung tâm bị đánh: ghi thời điểm (rung màn hình) + sự kiện centerHit', () => {
    const s = createGame(noRand);
    s.time = 3.5;
    damageCenter(s, 10);
    expect(s.lastCenterHitAt).toBe(3.5);
    expect(s.sounds).toContain('centerHit');
    expect(s.center.hp).toBe(290);
  });
});
