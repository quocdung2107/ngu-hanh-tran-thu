import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/state';
import { buildTower, destroyTowerByPlayer } from '../src/sim/towers';

const noRand = () => 0.99; // tránh chí mạng/ngẫu nhiên ngoài ý muốn

describe('tài nguyên khi xây/phá trụ', () => {
  it('trừ đúng Linh Thạch + tinh cùng hệ khi xây', () => {
    const s = createGame(noRand);
    expect(buildTower(s, 0, 'kim')).toBe(true);
    expect(s.resources.linhThach).toBe(200 - 40);
    expect(s.resources.tinh.kim).toBe(15 - 5);
    expect(s.resources.tinh.hoa).toBe(15); // hệ khác không đổi
  });

  it('không đủ tài nguyên thì từ chối và không trừ gì', () => {
    const s = createGame(noRand);
    s.resources.tinh.moc = 4; // thiếu 1 tinh Mộc
    expect(buildTower(s, 0, 'moc')).toBe(false);
    expect(s.resources.linhThach).toBe(200);
    expect(s.towers[0]).toBeNull();
    s.resources.tinh.moc = 15;
    s.resources.linhThach = 39;
    expect(buildTower(s, 0, 'moc')).toBe(false);
    expect(s.resources.tinh.moc).toBe(15);
  });

  it('phá trụ hoàn trả 0 tài nguyên', () => {
    const s = createGame(noRand);
    buildTower(s, 0, 'tho');
    const lt = s.resources.linhThach, tinh = s.resources.tinh.tho;
    expect(destroyTowerByPlayer(s, 0)).toBe(true);
    expect(s.resources.linhThach).toBe(lt);
    expect(s.resources.tinh.tho).toBe(tinh);
    expect(s.towers[0]).toBeNull();
  });

  it('không xây được vào ô đã có trụ, và khóa xây/phá khi đang chiến đấu', () => {
    const s = createGame(noRand);
    buildTower(s, 0, 'kim');
    expect(buildTower(s, 0, 'hoa')).toBe(false);
    s.phase = 'combat';
    expect(buildTower(s, 1, 'hoa')).toBe(false);
    expect(destroyTowerByPlayer(s, 0)).toBe(false);
  });
});
