import { expect, it } from 'vitest';
import { createGame } from '../src/sim/state';
import { buildTower, upgradeTower } from '../src/sim/towers';
import { startWave } from '../src/sim/waves';
import { tick } from '../src/sim/combat';
import { castSkill } from '../src/sim/skills';
import type { Element } from '../src/config/balance';

// Mô phỏng người chơi: xếp cả 2 vòng theo chuỗi tương sinh Kim→Thủy→Mộc→Hỏa→Thổ
// (mọi cặp kề đều tương sinh), nâng cấp tối đa trong các giai đoạn xây, đánh hết 8 đợt.
it('smoke: chơi trọn ván 8 đợt và THẮNG', () => {
  const s = createGame(() => 0.42);
  s.resources.linhThach = 5000;
  for (const k of Object.keys(s.resources.tinh) as Element[]) s.resources.tinh[k] = 500;
  const sinhChain: Element[] = ['kim', 'thuy', 'moc', 'hoa', 'tho'];
  sinhChain.forEach((e, i) => expect(buildTower(s, i, e)).toBe(true));
  sinhChain.forEach((e, i) => expect(buildTower(s, 5 + i, e)).toBe(true));
  expect(s.unlockedSkills).toContain('linhQuangTram');

  let guard = 0;
  while (s.phase !== 'won' && s.phase !== 'lost' && guard++ < 200) {
    if (s.phase === 'build') {
      for (let slot = 0; slot < s.towers.length; slot++) {
        while (s.towers[slot] && s.towers[slot]!.level < 3 && upgradeTower(s, slot)) { /* nâng tối đa */ }
      }
      startWave(s);
    }
    for (let i = 0; i < 20 * 90 && s.phase === 'combat'; i++) {
      tick(s, 1 / 20);
      if (s.unlockedSkills.length) castSkill(s, s.unlockedSkills[0]);
    }
  }
  console.log('Kết quả ván smoke:', s.phase, '| đợt:', s.wave, '| kills:', s.stats.kills, '| HP tâm:', Math.round(s.center.hp), '| HP hero:', Math.round(s.hero.hp));
  expect(s.phase).toBe('won');
  expect(s.stats.kills).toBe(149); // tổng số quái 8 đợt: 8+11+14+17+20+23+26+30
}, 60000);
