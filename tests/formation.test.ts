import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/state';
import { buildTower } from '../src/sim/towers';
import { checkRecipes, recipeSatisfied } from '../src/sim/formation';
import { destroyTowerInCombat } from '../src/sim/towers';

const noRand = () => 0.99;

function rich() {
  const s = createGame(noRand);
  s.resources.linhThach = 100000;
  for (const k of Object.keys(s.resources.tinh) as Array<keyof typeof s.resources.tinh>) s.resources.tinh[k] = 1000;
  return s;
}

describe('công thức trận pháp (D1)', () => {
  it('đủ 3 Kim + 2 Hỏa trong vòng 1 thì mở Kim Hỏa Liên Trảm', () => {
    const s = rich();
    buildTower(s, 0, 'kim'); buildTower(s, 1, 'kim'); buildTower(s, 2, 'kim');
    expect(s.unlockedSkills).not.toContain('kimHoaLienTram');
    buildTower(s, 3, 'hoa'); buildTower(s, 4, 'hoa');
    expect(recipeSatisfied(s, 'r1-kim-hoa')).toBe(true);
    expect(s.unlockedSkills).toContain('kimHoaLienTram');
  });

  it('không tính trụ vòng khác sang (D1: chỉ trong vòng)', () => {
    const s = rich();
    // 3 Kim ở vòng 2 (slot 5..7), 2 Hỏa ở vòng 1 → không thỏa công thức vòng 1
    buildTower(s, 5, 'kim'); buildTower(s, 6, 'kim'); buildTower(s, 7, 'kim');
    buildTower(s, 0, 'hoa'); buildTower(s, 1, 'hoa');
    expect(recipeSatisfied(s, 'r1-kim-hoa')).toBe(false);
    expect(s.unlockedSkills).not.toContain('kimHoaLienTram');
  });

  it('mở khóa VĨNH VIỄN: phá hết trụ vẫn giữ kỹ năng', () => {
    const s = rich();
    buildTower(s, 0, 'kim'); buildTower(s, 1, 'moc'); buildTower(s, 2, 'thuy');
    buildTower(s, 3, 'hoa'); buildTower(s, 4, 'tho');
    expect(s.unlockedSkills).toContain('linhQuangTram');
    for (let i = 0; i < 5; i++) destroyTowerInCombat(s, i);
    checkRecipes(s);
    expect(s.unlockedSkills).toContain('linhQuangTram');
    expect(recipeSatisfied(s, 'r1-ngu-hanh')).toBe(false); // công thức không còn thỏa nhưng chiêu đã học không mất
  });

  it('5 trụ thuần hệ ở vòng 2 mở chiêu tối thượng của hệ đó', () => {
    const s = rich();
    for (let i = 5; i < 10; i++) buildTower(s, i, 'hoa');
    expect(s.unlockedSkills).toContain('phanThienHoaVu');
  });
});
