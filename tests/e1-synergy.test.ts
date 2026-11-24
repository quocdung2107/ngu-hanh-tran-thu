import { describe, expect, it } from 'vitest';
import { createGame, tryRoot, tryStun, type Enemy } from '../src/sim/state';
import { buildTower, towerEffectiveDmg, upgradeTower } from '../src/sim/towers';
import { pairKind, synergyLinks, towerSynergyMul } from '../src/sim/formation';
import { spawnEnemy, updateEnemies } from '../src/sim/enemies';
import { upgradeCostFor } from '../src/config/towers';
import { startWave } from '../src/sim/waves';

const noRand = () => 0.99;

function rich() {
  const s = createGame(noRand);
  s.resources.linhThach = 100000;
  for (const k of Object.keys(s.resources.tinh) as Array<keyof typeof s.resources.tinh>) s.resources.tinh[k] = 1000;
  return s;
}

describe('E1 — tương sinh/khắc theo trụ kề trong vòng', () => {
  it('phân loại cặp: sinh theo chuỗi Kim→Thủy→Mộc→Hỏa→Thổ→Kim, khắc theo Kim khắc Mộc...', () => {
    expect(pairKind('kim', 'thuy')).toBe('sinh');
    expect(pairKind('thuy', 'kim')).toBe('sinh');
    expect(pairKind('tho', 'kim')).toBe('sinh'); // Thổ sinh Kim
    expect(pairKind('kim', 'moc')).toBe('khac'); // Kim khắc Mộc
    expect(pairKind('moc', 'kim')).toBe('khac');
    expect(pairKind('hoa', 'kim')).toBe('khac'); // Hỏa khắc Kim
    expect(pairKind('kim', 'kim')).toBeNull();
  });

  it('cặp tương sinh: cả hai trụ +15% sát thương', () => {
    const s = rich();
    buildTower(s, 0, 'kim'); buildTower(s, 1, 'thuy'); // kề nhau, Kim sinh Thủy
    expect(towerSynergyMul(s, 0)).toBeCloseTo(1.15);
    expect(towerSynergyMul(s, 1)).toBeCloseTo(1.15);
    const links = synergyLinks(s);
    expect(links).toContainEqual({ a: 0, b: 1, kind: 'sinh' });
  });

  it('cộng dồn 2 phía: trụ giữa có 2 hàng xóm tương sinh được +30%', () => {
    const s = rich();
    // tho — kim — thuy: Thổ sinh Kim, Kim sinh Thủy → Kim ở giữa +30%
    buildTower(s, 0, 'tho'); buildTower(s, 1, 'kim'); buildTower(s, 2, 'thuy');
    expect(towerSynergyMul(s, 1)).toBeCloseTo(1.30);
  });

  it('cặp tương khắc: trụ khắc +10%, trụ bị khắc −10%', () => {
    const s = rich();
    buildTower(s, 0, 'kim'); buildTower(s, 1, 'moc'); // Kim khắc Mộc
    expect(towerSynergyMul(s, 0)).toBeCloseTo(1.10);
    expect(towerSynergyMul(s, 1)).toBeCloseTo(0.90);
  });

  it('mất hiệu ứng khi trụ kề bị phá', () => {
    const s = rich();
    buildTower(s, 0, 'kim'); buildTower(s, 1, 'thuy');
    expect(towerSynergyMul(s, 0)).toBeCloseTo(1.15);
    s.towers[1] = null; // trụ kề bị phá trong chiến đấu
    expect(towerSynergyMul(s, 0)).toBe(1);
    expect(synergyLinks(s).length).toBe(0);
  });

  it('không tính kềข้าม vòng: ô cuối vòng 1 không kề ô đầu vòng 2', () => {
    const s = rich();
    buildTower(s, 4, 'kim'); buildTower(s, 5, 'thuy');
    expect(towerSynergyMul(s, 4)).toBe(1);
    expect(towerSynergyMul(s, 5)).toBe(1);
  });
});

describe('E1 — nâng cấp trụ 3 cấp', () => {
  it('giá nâng: cấp 2 = 60% giá xây, cấp 3 = 120% giá xây', () => {
    expect(upgradeCostFor('kim', 2)).toEqual({ linhThach: 24, tinh: 3 });
    expect(upgradeCostFor('kim', 3)).toEqual({ linhThach: 48, tinh: 6 });
  });

  it('nâng cấp trừ đúng tài nguyên, tăng dmg ×1.6/×2.5 và HP +50% ở cấp 2', () => {
    const s = createGame(noRand);
    s.linhMach = []; // trung hòa Linh Mạch để đo riêng hệ số cấp
    s.resources.tinh.kim = 50; // đủ tinh cho cả 2 lần nâng
    buildTower(s, 0, 'kim');
    const lt = s.resources.linhThach, tinh = s.resources.tinh.kim;
    expect(upgradeTower(s, 0)).toBe(true);
    expect(s.resources.linhThach).toBe(lt - 24);
    expect(s.resources.tinh.kim).toBe(tinh - 3);
    expect(s.towers[0]!.level).toBe(2);
    expect(s.towers[0]!.maxHp).toBe(120); // 80 × 1.5
    expect(towerEffectiveDmg(s, s.towers[0]!)).toBeCloseTo(14 * 1.6);
    expect(upgradeTower(s, 0)).toBe(true);
    expect(s.towers[0]!.level).toBe(3);
    expect(towerEffectiveDmg(s, s.towers[0]!)).toBeCloseTo(14 * 2.5);
    expect(upgradeTower(s, 0)).toBe(false); // đã tối đa
  });

  it('không nâng được khi đang chiến đấu hoặc không đủ tài nguyên', () => {
    const s = createGame(noRand);
    buildTower(s, 0, 'kim');
    s.resources.linhThach = 0;
    expect(upgradeTower(s, 0)).toBe(false);
    const s2 = rich();
    buildTower(s2, 0, 'kim');
    s2.phase = 'combat';
    expect(upgradeTower(s2, 0)).toBe(false);
  });
});

describe('E1 — vai trò quái & boss', () => {
  it('quái Xa dừng ở tầm 2.5 bắn trụ/trung tâm, không đi vào trung tâm', () => {
    const s = rich();
    buildTower(s, 0, 'tho'); // vòng 1 bán kính 2.0
    startWave(s);
    s.spawnQueue = []; s.toSpawn = 0;
    spawnEnemy(s, 'xa');
    const e = s.enemies[0];
    e.x = 0; e.y = -4.5; // đi từ cổng Bắc xuống
    const towerHp0 = s.towers[0]!.hp;
    for (let i = 0; i < 20 * 20; i++) { // 20 giây
      s.time += 1 / 20;
      updateEnemies(s, 1 / 20);
      if (!s.towers[0]) break;
    }
    const dCenter = Math.hypot(e.x, e.y);
    // Xa không bao giờ áp sát trung tâm (giữ khoảng ≥ ~2.4) và đã gây sát thương từ xa
    expect(dCenter).toBeGreaterThan(2.3);
    expect(s.center.hp < 300 || !s.towers[0] || s.towers[0]!.hp < towerHp0).toBe(true);
  });

  it('boss: HP ×10, to gấp đôi, rơi nhiều tài nguyên', () => {
    const s = createGame(noRand);
    s.wave = 8;
    spawnEnemy(s, 'boss');
    const b = s.enemies[0];
    expect(b.isBoss).toBe(true);
    expect(b.maxHp).toBeCloseTo(55 * 2.45 * 10);
    expect(b.radius).toBeCloseTo(0.32 * 2);
    expect(b.rewardLt).toBe(60);
    expect(b.rewardTinh).toBe(12);
  });

  it('boss miễn trói/choáng nửa chu kỳ, chịu ở nửa còn lại; quái thường luôn chịu', () => {
    const s = createGame(noRand);
    spawnEnemy(s, 'boss');
    const b = s.enemies[0];
    s.time = 0.5; // trong nửa đầu chu kỳ 4s → miễn nhiễm
    tryRoot(s, b, 1); tryStun(s, b, 1);
    expect(b.rootUntil).toBe(0);
    expect(b.stunUntil).toBe(0);
    s.time = 3.0; // nửa sau chu kỳ → chịu hiệu ứng
    tryRoot(s, b, 1); tryStun(s, b, 0.5);
    expect(b.rootUntil).toBe(4.0);
    expect(b.stunUntil).toBe(3.5);
    const s2 = createGame(noRand);
    spawnEnemy(s2, 'thuong');
    const n = s2.enemies[0] as Enemy;
    s2.time = 0.5;
    tryRoot(s2, n, 1);
    expect(n.rootUntil).toBe(1.5);
  });

  it('quái Hồi hồi máu cho đồng minh quanh, không hồi chính mình và không hồi boss', () => {
    const s = createGame(noRand);
    s.wave = 6;
    spawnEnemy(s, 'hoi');
    spawnEnemy(s, 'thuong');
    spawnEnemy(s, 'boss');
    const [healer, ally, boss] = s.enemies;
    healer.x = 0; healer.y = -5; ally.x = 0.5; ally.y = -5; boss.x = -0.5; boss.y = -5;
    ally.hp = 10; boss.hp = 100; healer.hp = healer.maxHp - 5;
    healer.healCd = 0;
    updateEnemies(s, 0.05);
    expect(ally.hp).toBeGreaterThan(10);
    expect(boss.hp).toBe(100);
    expect(healer.hp).toBe(healer.maxHp - 5);
  });
});

describe('E1 — Linh Mạch', () => {
  it('mỗi ván có 1–2 ô Linh Mạch; trụ trên ô được +25% sát thương', () => {
    const s = rich();
    expect(s.linhMach.length).toBeGreaterThanOrEqual(1);
    expect(s.linhMach.length).toBeLessThanOrEqual(2);
    const slot = s.linhMach[0];
    buildTower(s, slot, 'kim');
    // cô lập: phá mọi trụ kề để loại tương sinh/khắc khỏi phép đo
    const ringStart = Math.floor(slot / 5) * 5;
    for (let i = 0; i < 5; i++) {
      const nb = ringStart + i;
      if (nb !== slot && s.towers[nb]) s.towers[nb] = null;
    }
    expect(towerEffectiveDmg(s, s.towers[slot]!)).toBeCloseTo(14 * 1.25);
  });

  it('trụ ngoài ô Linh Mạch không được cộng', () => {
    const s = rich();
    const normal = s.towers.findIndex((_, i) => !s.linhMach.includes(i));
    buildTower(s, normal, 'kim');
    expect(towerEffectiveDmg(s, s.towers[normal]!)).toBeCloseTo(14);
  });
});
