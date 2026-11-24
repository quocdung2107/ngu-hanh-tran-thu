import { describe, expect, it } from 'vitest';
import { createGame, type Enemy } from '../src/sim/state';
import { buildTower } from '../src/sim/towers';
import { aoePowerScale, livingTowersInRing, updateRingUlts } from '../src/sim/formation';
import { computeHeroStats } from '../src/sim/hero';
import { collectDeaths } from '../src/sim/waves';

const noRand = () => 0.99;

function rich() {
  const s = createGame(noRand);
  s.resources.linhThach = 100000;
  for (const k of Object.keys(s.resources.tinh) as Array<keyof typeof s.resources.tinh>) s.resources.tinh[k] = 1000;
  return s;
}

function mkEnemy(s: ReturnType<typeof createGame>, x: number, y: number, hp = 500): Enemy {
  const e: Enemy = {
    id: s.nextEnemyId++, element: 'hoa', x, y, hp, maxHp: hp, atkCd: 0,
    slowUntil: 0, slowPct: 0, rootUntil: 0, stunUntil: 0, rootCdUntil: 0, alive: true,
  };
  s.enemies.push(e);
  return e;
}

describe('tuyệt kỹ AoE của vòng (D2)', () => {
  it('hệ số sức mạnh: 3 trụ 60%, 4 trụ 80%, 5 trụ 100%, dưới 3 là 0', () => {
    expect(aoePowerScale(2)).toBe(0);
    expect(aoePowerScale(3)).toBe(0.6);
    expect(aoePowerScale(4)).toBe(0.8);
    expect(aoePowerScale(5)).toBe(1.0);
  });

  it('dưới 3 trụ sống: cooldown ĐÓNG BĂNG', () => {
    const s = rich();
    buildTower(s, 0, 'kim'); buildTower(s, 1, 'moc'); // chỉ 2 trụ vòng 1
    s.rings[0].cooldown = 5;
    updateRingUlts(s, 1);
    expect(s.rings[0].cooldown).toBe(5);
  });

  it('đủ 3 trụ: cooldown giảm, về 0 và đủ quái thì tự nổ với dmg đã scale', () => {
    const s = rich();
    buildTower(s, 0, 'kim'); buildTower(s, 1, 'moc'); buildTower(s, 2, 'thuy'); // 3 trụ → 60%
    expect(livingTowersInRing(s, 0)).toBe(3);
    const es = [mkEnemy(s, 1, 0), mkEnemy(s, -1, 0), mkEnemy(s, 0, 1)]; // trong bán kính vòng 1 (2.0+1.1)
    s.rings[0].cooldown = 0.1;
    updateRingUlts(s, 0.2);
    for (const e of es) expect(e.hp).toBe(500 - 45 * 0.6); // Ngũ Hành Lôi 45 × 0.6
    expect(s.rings[0].cooldown).toBe(12); // đặt lại cooldown đầy đủ
  });

  it('chưa đủ 3 quái trong vòng thì không nổ, cooldown giữ ở 0', () => {
    const s = rich();
    buildTower(s, 0, 'kim'); buildTower(s, 1, 'moc'); buildTower(s, 2, 'thuy');
    mkEnemy(s, 1, 0); mkEnemy(s, -1, 0); // chỉ 2 quái
    s.rings[0].cooldown = 0;
    updateRingUlts(s, 0.5);
    expect(s.rings[0].cooldown).toBe(0);
    expect(s.enemies[0].hp).toBe(500);
  });
});

describe('quái rơi tài nguyên đúng hệ', () => {
  it('quái Hỏa chết rơi Linh Thạch + tinh Hỏa, không rơi hệ khác', () => {
    const s = createGame(noRand);
    const e = mkEnemy(s, 3, 3, 10);
    e.element = 'hoa'; e.hp = 0;
    const lt = s.resources.linhThach, hoa = s.resources.tinh.hoa, kim = s.resources.tinh.kim;
    collectDeaths(s);
    expect(s.resources.linhThach).toBe(lt + 6);
    expect(s.resources.tinh.hoa).toBe(hoa + 2);
    expect(s.resources.tinh.kim).toBe(kim);
    expect(s.stats.kills).toBe(1);
    expect(s.enemies.length).toBe(0);
  });
});

describe('thuộc tính nhân vật theo số trụ sống', () => {
  it('mỗi trụ Kim +3 DMG/+1% crit; Thổ +15 HP/+2 giáp; mất khi trụ bị phá', () => {
    const s = rich();
    buildTower(s, 0, 'kim'); buildTower(s, 1, 'kim'); buildTower(s, 5, 'tho');
    let st = computeHeroStats(s);
    expect(st.dmg).toBe(12 + 6);
    expect(st.critChance).toBeCloseTo(0.05 + 0.02);
    expect(st.maxHp).toBe(220 + 15);
    expect(st.armor).toBe(2);
    s.towers[0] = null; // Kim bị phá
    st = computeHeroStats(s);
    expect(st.dmg).toBe(12 + 3);
  });
});
