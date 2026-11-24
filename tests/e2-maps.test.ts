import { describe, expect, it } from 'vitest';
import { MAPS, gatesOf, mapById } from '../src/config/maps';
import { createGame, damageCenter, layoutOf } from '../src/sim/state';
import { buildTower, upgradeTower } from '../src/sim/towers';
import { applyFormationCode, decodeFormation, encodeFormation } from '../src/sim/formationCode';
import { defaultProgress, recordMapWin, recordWaveReached, savePreset } from '../src/persistence';
import type { Element } from '../src/config/balance';

const noRand = () => 0.99;

function rich(mapId = 'map1') {
  const s = createGame(noRand, mapById(mapId));
  s.resources.linhThach = 100000;
  for (const k of Object.keys(s.resources.tinh) as Element[]) s.resources.tinh[k] = 1000;
  return s;
}

describe('E2 — cấu hình 3 bản đồ', () => {
  it('số vòng/số ô/cổng từng bản đồ đúng thiết kế', () => {
    const [m1, m2, m3] = MAPS;
    expect(m1.rings.map((r) => r.slots)).toEqual([5, 5]);
    expect(m2.rings.map((r) => r.slots)).toEqual([5, 5, 6]);
    expect(m3.rings.map((r) => r.slots)).toEqual([5, 5, 6, 8]);
    expect([m1.gates, m2.gates, m3.gates]).toEqual([4, 6, 6]);
    expect(gatesOf(m1).length).toBe(4);
    expect(gatesOf(m2).length).toBe(6);
    expect(layoutOf(m1).totalSlots).toBe(10);
    expect(layoutOf(m2).totalSlots).toBe(16);
    expect(layoutOf(m3).totalSlots).toBe(24);
  });

  it('createGame theo bản đồ: số ô, số vòng cooldown, khiên trung tâm', () => {
    const s2 = createGame(noRand, mapById('map2'));
    expect(s2.towers.length).toBe(16);
    expect(s2.rings.length).toBe(3);
    expect(s2.center.shieldHp).toBe(0);
    const s3 = createGame(noRand, mapById('map3'));
    expect(s3.towers.length).toBe(24);
    expect(s3.rings.length).toBe(4);
    expect(s3.center.shieldHp).toBe(400);
    expect(s3.center.maxShieldHp).toBe(400);
  });

  it('trung tâm 2 lớp: khiên hứng đòn trước, cạn khiên mới trừ HP chính', () => {
    const s = createGame(noRand, mapById('map3'));
    damageCenter(s, 50);
    expect(s.center.shieldHp).toBe(350);
    expect(s.center.hp).toBe(300);
    damageCenter(s, 400);
    expect(s.center.shieldHp).toBe(0);
    expect(s.center.hp).toBe(250);
  });

  it('xây được trụ ở vòng 3/4 của bản đồ lớn và công thức vòng 3 hoạt động', () => {
    const s = rich('map2');
    // vòng 3 = ô 10..15: xây 3 Kim + 2 Thủy → mở Kim Thủy Hàn Kiếm
    const r3 = s.layout.offsets[2];
    buildTower(s, r3, 'kim'); buildTower(s, r3 + 1, 'kim'); buildTower(s, r3 + 2, 'kim');
    buildTower(s, r3 + 3, 'thuy'); buildTower(s, r3 + 4, 'thuy');
    expect(s.unlockedSkills).toContain('kimThuyHanKiem');
    const s3 = rich('map3');
    const r4 = s3.layout.offsets[3];
    for (let i = 0; i < 5; i++) buildTower(s3, r4 + i, 'hoa');
    expect(s3.unlockedSkills).toContain('cuuThienPhanThe');
  });
});

describe('E2 — mã trận hình', () => {
  it('encode → decode → apply khôi phục đúng hệ và cấp từng ô', () => {
    const s = rich();
    buildTower(s, 0, 'kim'); upgradeTower(s, 0); // Kim cấp 2
    buildTower(s, 3, 'hoa');
    buildTower(s, 7, 'tho'); upgradeTower(s, 7); upgradeTower(s, 7); // Thổ cấp 3
    const code = encodeFormation(s);
    const decoded = decodeFormation(code);
    expect(decoded?.mapId).toBe('map1');
    expect(decoded?.slots[0]).toEqual({ element: 'kim', level: 2 });
    expect(decoded?.slots[1]).toBeNull();
    expect(decoded?.slots[7]).toEqual({ element: 'tho', level: 3 });

    const s2 = rich();
    const report = applyFormationCode(s2, code);
    expect(report.ok).toBe(true);
    expect(report.placed).toBe(3);
    expect(s2.towers[0]?.element).toBe('kim');
    expect(s2.towers[0]?.level).toBe(2);
    expect(s2.towers[7]?.level).toBe(3);
    expect(encodeFormation(s2)).toBe(code); // round-trip ổn định
  });

  it('nhập mã khi thiếu tài nguyên: xây được phần đủ tiền và báo cáo bỏ qua', () => {
    const s = rich();
    for (let i = 0; i < 10; i++) buildTower(s, i, 'kim');
    const code = encodeFormation(s);
    const poor = createGame(noRand); // chỉ 200 LT + 15 tinh/hệ → xây tối đa 3 trụ Kim (tinh Kim 15/5)
    const report = applyFormationCode(poor, code);
    expect(report.ok).toBe(true);
    expect(report.placed).toBe(3);
    expect(report.skipped).toBe(7);
  });

  it('từ chối mã sai định dạng, sai bản đồ, hoặc khi đang chiến đấu', () => {
    const s = rich();
    expect(decodeFormation('mã linh tinh')).toBeNull();
    expect(applyFormationCode(s, 'NH1.map2....................').ok).toBe(false); // mã của map2
    const code = encodeFormation(s);
    s.phase = 'combat';
    expect(applyFormationCode(s, code).ok).toBe(false);
  });
});

describe('E2 — tiến độ chiến dịch (hàm thuần)', () => {
  it('thắng bản đồ mở bản đồ kế; đợt cao nhất chỉ tăng', () => {
    let p = defaultProgress();
    expect(p.unlocked).toEqual(['map1']);
    p = recordWaveReached(p, 'map1', 3);
    p = recordWaveReached(p, 'map1', 2); // thấp hơn → không đổi
    expect(p.highestWave.map1).toBe(3);
    p = recordMapWin(p, 'map1');
    expect(p.unlocked).toContain('map2');
    expect(p.highestWave.map1).toBe(8);
    p = recordMapWin(p, 'map2');
    expect(p.unlocked).toContain('map3');
    p = recordMapWin(p, 'map3'); // không còn bản đồ sau
    expect(p.unlocked).toEqual(['map1', 'map2', 'map3']);
  });

  it('lưu preset theo bản đồ', () => {
    let p = defaultProgress();
    p = savePreset(p, 'map1', 'NH1.map1.K1........');
    expect(p.presets.map1).toContain('NH1.map1');
    expect(p.presets.map2).toBeUndefined();
  });
});
