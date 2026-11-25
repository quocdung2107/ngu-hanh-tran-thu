import { describe, expect, it } from 'vitest';
import { DAO_NGO_NODES } from '../src/config/daongo';
import { endlessWaveDef, getWaveDef, TOTAL_WAVES, WAVES } from '../src/config/waves';
import { modifiersFromNodes } from '../src/sim/daongo';
import { createGame } from '../src/sim/state';
import { buildTower } from '../src/sim/towers';
import { updateHero } from '../src/sim/hero';
import { updateRingUlts } from '../src/sim/formation';
import { checkWaveEnd, startWave } from '../src/sim/waves';
import { buyNode, defaultProgress, recordEndlessWave, recordMapWin } from '../src/persistence';
import type { Element } from '../src/config/balance';

const noRand = () => 0.99;

describe('E3 — cây Đạo Ngộ', () => {
  it('đủ 12 nút trong cấu hình, id không trùng', () => {
    expect(DAO_NGO_NODES.length).toBe(12);
    expect(new Set(DAO_NGO_NODES.map((n) => n.id)).size).toBe(12);
  });

  it('modifiersFromNodes gộp đúng hiệu ứng', () => {
    const empty = modifiersFromNodes([]);
    expect(empty.startLtBonus).toBe(0);
    expect(empty.ultCdMul).toBe(1);
    const m = modifiersFromNodes(['khai-mon', 'gia-cat', 'kim-hue', 'tam-cang', 'linh-mach-phu', 'than-hanh', 'dai-dao', 'tu-linh']);
    expect(m.startLtBonus).toBe(300);
    expect(m.startTinhBonus).toBe(5);
    expect(m.priceDiscount.kim).toBe(0.2);
    expect(m.priceDiscount.moc).toBe(0);
    expect(m.centerHpBonus).toBe(100);
    expect(m.extraLinhMach).toBe(1);
    expect(m.heroMaxHpBonus).toBe(40);
    expect(m.ultCdMul).toBeCloseTo(0.85);
  });

  it('mua nút: đủ điểm thì trừ điểm + sở hữu; thiếu điểm/trùng/nút lạ thì từ chối', () => {
    let p = defaultProgress();
    expect(buyNode(p, 'khai-mon').ok).toBe(false); // 0 điểm
    p = { ...p, daoNgoPoints: 5 };
    const r = buyNode(p, 'khai-mon');
    expect(r.ok).toBe(true);
    expect(r.progress.daoNgoPoints).toBe(4);
    expect(r.progress.ownedNodes).toContain('khai-mon');
    expect(buyNode(r.progress, 'khai-mon').ok).toBe(false); // đã sở hữu
    expect(buyNode(r.progress, 'khong-ton-tai').ok).toBe(false);
  });

  it('hiệu ứng áp vào ván mới: tài nguyên đầu ván, HP tâm, HP nhân vật, thêm ô Linh Mạch', () => {
    const mods = modifiersFromNodes(['khai-mon', 'tu-linh', 'tam-cang', 'than-hanh', 'linh-mach-phu']);
    const s = createGame(noRand, undefined, { modifiers: mods });
    expect(s.resources.linhThach).toBe(200 + 100);
    expect(s.resources.tinh.kim).toBe(15 + 5);
    expect(s.center.maxHp).toBe(400);
    expect(s.center.hp).toBe(400);
    expect(s.hero.hp).toBe(280); // 240 gốc + 40 Đạo Ngộ
    expect(s.linhMach.length).toBeGreaterThanOrEqual(2); // 1–2 gốc + 1 phụ
  });

  it('giảm giá theo hệ áp vào giá xây thực tế (Kim −20%: 40→32 LT, 5→4 tinh)', () => {
    const mods = modifiersFromNodes(['kim-hue']);
    const s = createGame(noRand, undefined, { modifiers: mods });
    expect(buildTower(s, 0, 'kim')).toBe(true);
    expect(s.resources.linhThach).toBe(200 - 32);
    expect(s.resources.tinh.kim).toBe(15 - 4);
    // hệ khác không giảm
    expect(buildTower(s, 1, 'moc')).toBe(true);
    expect(s.resources.linhThach).toBe(200 - 32 - 40);
  });

  it('Đại Đạo: tuyệt kỹ đặt lại cooldown nhanh hơn 15%', () => {
    const mods = modifiersFromNodes(['dai-dao']);
    const s = createGame(noRand, undefined, { modifiers: mods });
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
    expect(s.rings[0].cooldown).toBeCloseTo(12 * 0.85);
  });

  it('thắng bản đồ thưởng điểm: lần đầu +2, thắng lại +1', () => {
    let p = defaultProgress();
    p = recordMapWin(p, 'map1');
    expect(p.daoNgoPoints).toBe(2);
    p = recordMapWin(p, 'map1');
    expect(p.daoNgoPoints).toBe(3);
  });
});

describe('E3 — chế độ Vô Tận', () => {
  it('đợt vô tận scale: số quái tăng, HP nhân mũ nhẹ theo lũy tiến', () => {
    const w9 = endlessWaveDef(9);
    const w12 = endlessWaveDef(12);
    expect(w9.count).toBeGreaterThan(WAVES[TOTAL_WAVES - 1].count);
    expect(w12.count).toBeGreaterThan(w9.count);
    expect(w9.hpMul).toBeCloseTo(WAVES[TOTAL_WAVES - 1].hpMul * 1.12);
    expect(w12.hpMul).toBeCloseTo(WAVES[TOTAL_WAVES - 1].hpMul * Math.pow(1.12, 4));
    expect(w12.composition.reduce((s, c) => s + c.count, 0)).toBe(w12.count);
    expect(getWaveDef(9, false).wave).toBe(8); // không vô tận → kẹp ở đợt 8
    expect(getWaveDef(9, true).wave).toBe(9);
    // boss ở đợt chia hết cho 5 (10, 15...) — đợt 10 có boss
    expect(endlessWaveDef(10).composition).toContainEqual({ kind: 'boss', count: 1 });
  });

  it('vô tận không bao giờ thắng: hết đợt 8 vẫn sang đợt 9 ở giai đoạn xây', () => {
    const s = createGame(noRand, undefined, { endless: true });
    s.wave = 8;
    startWave(s);
    s.toSpawn = 0; s.spawnQueue = []; s.enemies = [];
    checkWaveEnd(s);
    expect(s.phase).toBe('build');
    expect(s.wave).toBe(9);
  });

  it('kỷ lục vô tận chỉ tăng', () => {
    let p = defaultProgress();
    p = recordEndlessWave(p, 'map1', 11);
    p = recordEndlessWave(p, 'map1', 9);
    expect(p.endlessBest.map1).toBe(11);
  });
});

describe('E3→E6 — di chuyển nhân vật bằng lệnh click', () => {
  // E6 CẬP NHẬT LUẬT: điều khiển di chuyển được gộp chung như Dã Chiến —
  // heroMoveTarget luôn được tôn trọng, không còn phụ thuộc công tắc
  // clickToMove của E3 (công tắc chỉ còn là trường cài đặt tương thích).
  it('nhân vật đi về điểm đích kể cả khi không có quái, bất kể công tắc E3 bật hay tắt', () => {
    const on = createGame(noRand, undefined, { clickToMove: true });
    on.phase = 'combat';
    on.heroMoveTarget = { x: 4, y: 0 };
    const x0 = on.hero.x;
    for (let i = 0; i < 20; i++) updateHero(on, 1 / 20);
    expect(on.hero.x).toBeGreaterThan(x0 + 1);

    const off = createGame(noRand); // clickToMove = false (mặc định E3)
    off.phase = 'combat';
    off.heroMoveTarget = { x: 4, y: 0 }; // E6: đích vẫn được tôn trọng như Dã Chiến
    const ox = off.hero.x;
    for (let i = 0; i < 20; i++) updateHero(off, 1 / 20);
    expect(off.hero.x).toBeGreaterThan(ox + 1);
  });

  // E6 CẬP NHẬT LUẬT: ĐÃ BỎ bán kính hoạt động 6 quanh tâm — nhân vật đi tự do
  // toàn bản đồ, chỉ bị kẹp ở BIÊN bản đồ (map 1: cạnh 60 → |tọa độ| ≤ 29.5).
  it('điểm đích xa: nhân vật ra khỏi bán kính 6 cũ và bị kẹp ở biên bản đồ', () => {
    const s = createGame(noRand, undefined, { clickToMove: true });
    s.phase = 'combat';
    s.heroMoveTarget = { x: 100, y: 0 }; // đích ngoài bản đồ
    for (let i = 0; i < 20 * 20; i++) updateHero(s, 1 / 20);
    expect(Math.hypot(s.hero.x, s.hero.y)).toBeGreaterThan(6);
    expect(s.hero.x).toBeCloseTo(29.5, 0);
    expect(Math.abs(s.hero.y)).toBeLessThan(0.01);
  });
});
