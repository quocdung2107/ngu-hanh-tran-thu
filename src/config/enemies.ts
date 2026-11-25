// Khung chỉ số quái chung cho cả 5 hệ — khác nhau ở hệ (màu + tinh rơi đúng hệ).
export const ENEMY_BASE = {
  hp: 55,
  speed: 1.1, // E6 cân bằng: 0.55 → 1.1 — bản đồ lớn (spawn ở biên, hành quân 30–40 đơn vị) cần tốc độ gấp đôi để đợt không kéo dài và quái dồn tới đủ dày như sân khấu cũ
  dmg: 6,
  atkPerSec: 1.0,
  rewardLinhThach: 8,
  rewardTinh: 3, // tinh của chính hệ của quái (E4 cân bằng: tăng để đủ xây lại trụ bị phá)
  radius: 0.32,
};

// E1 — Vai trò quái (dùng chung cho cả 5 hệ). Hệ số nhân lên chỉ số gốc của đợt.
export type EnemyRole = 'thuong' | 'toc' | 'giap' | 'xa' | 'hoi';

export interface EnemyRoleDef {
  name: string;
  hpMul: number;
  speedMul: number;
  dmgMul: number;
  radiusMul: number;
  rewardMul: number;
}

export const ENEMY_ROLES: Record<EnemyRole, EnemyRoleDef> = {
  thuong: { name: 'Thường', hpMul: 1, speedMul: 1, dmgMul: 1, radiusMul: 1, rewardMul: 1 },
  toc: { name: 'Tốc', hpMul: 0.6, speedMul: 1.8, dmgMul: 0.8, radiusMul: 0.85, rewardMul: 1 },
  giap: { name: 'Giáp', hpMul: 2.6, speedMul: 0.6, dmgMul: 1.2, radiusMul: 1.25, rewardMul: 1.5 },
  xa: { name: 'Xa', hpMul: 0.9, speedMul: 0.8, dmgMul: 1, radiusMul: 1, rewardMul: 1.2 },
  hoi: { name: 'Hồi', hpMul: 1.1, speedMul: 0.7, dmgMul: 0.5, radiusMul: 1.05, rewardMul: 1.5 },
};

// Quái Xa: dừng ở tầm này để bắn trụ/trung tâm, không áp sát trung tâm.
export const ENEMY_RANGED_RANGE = 2.5;
// Quái Giáp: chủ động tìm trụ trong tầm này để đánh (ưu tiên phá trụ).
export const GIAP_TOWER_SEEK_RANGE = 2.4;
// Quái Hồi: hồi máu cho đồng minh quanh (không hồi chính mình, không hồi boss).
export const HEAL_RADIUS = 2.2;
export const HEAL_INTERVAL = 2.5; // giây giữa hai lần hồi
export const HEAL_BASE = 10; // E4 cân bằng: 15 → 10      // lượng hồi gốc, nhân hệ số HP của đợt

// E1 — Boss đợt cuối: HP ×10 (E4 chỉnh từ ×12), to gấp đôi, miễn trói/choáng 50% thời gian, rơi nhiều tài nguyên.
export const BOSS_HP_MUL = 10; // E4 cân bằng: 12 → 10
export const BOSS_SIZE_MUL = 2;
export const BOSS_SPEED_MUL = 0.7;
export const BOSS_DMG_MUL = 2;
export const BOSS_REWARD_LINH_THACH = 60;
export const BOSS_REWARD_TINH = 12;
export const BOSS_CC_CYCLE = 4; // chu kỳ 4s: nửa đầu chu kỳ miễn trói/choáng, nửa sau chịu bình thường
