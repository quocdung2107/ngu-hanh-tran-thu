import { expect, it } from 'vitest';
import { createGame } from '../src/sim/state';
import { buildTower } from '../src/sim/towers';
import { startWave } from '../src/sim/waves';
import { tick } from '../src/sim/combat';
import { castSkill } from '../src/sim/skills';
import type { Element } from '../src/config/balance';

// Mô phỏng người chơi: xây vòng 1 ngũ hành + vòng 2 hỏa/thủy, đánh hết 5 đợt.
it('smoke: chơi trọn ván không lỗi, tới được trạng thái kết thúc', () => {
  const s = createGame(() => 0.42);
  s.resources.linhThach = 5000;
  for (const k of Object.keys(s.resources.tinh) as Element[]) s.resources.tinh[k] = 500;
  const ring1: Element[] = ['kim', 'moc', 'thuy', 'hoa', 'tho'];
  ring1.forEach((e, i) => expect(buildTower(s, i, e)).toBe(true));
  const ring2: Element[] = ['hoa', 'thuy', 'hoa', 'thuy', 'kim'];
  ring2.forEach((e, i) => expect(buildTower(s, 5 + i, e)).toBe(true));
  expect(s.unlockedSkills).toContain('linhQuangTram');

  let guard = 0;
  while (s.phase !== 'won' && s.phase !== 'lost' && guard++ < 200) {
    if (s.phase === 'build') startWave(s);
    for (let i = 0; i < 20 * 60 && s.phase === 'combat'; i++) {
      tick(s, 1 / 20);
      if (s.unlockedSkills.length) castSkill(s, s.unlockedSkills[0]);
    }
  }
  console.log('Kết quả ván smoke:', s.phase, '| đợt:', s.wave, '| kills:', s.stats.kills, '| HP tâm:', s.center.hp, '| HP hero:', Math.round(s.hero.hp));
  expect(['won', 'lost']).toContain(s.phase);
  expect(s.stats.kills).toBeGreaterThan(0);
}, 60000);
