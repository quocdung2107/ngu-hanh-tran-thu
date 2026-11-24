export type SkillKind = 'damageArea' | 'heal' | 'shield';
export type SkillCenter = 'hero' | 'nearestEnemy' | 'center';

export interface SkillDef {
  id: string;
  name: string;
  manaCost: number;
  cooldown: number; // giây
  kind: SkillKind;
  power: number;    // damageArea: sát thương gốc | heal: HP hồi cho nhân vật | shield: lượng lá chắn
  centerHeal?: number; // heal: HP hồi thêm cho trung tâm
  radius: number;   // damageArea
  center: SkillCenter;
  stunSec?: number;
  rootSec?: number;
  slowPct?: number; slowSec?: number;
  desc: string;
}

export const SKILLS: Record<string, SkillDef> = {
  linhQuangTram: {
    id: 'linhQuangTram', name: 'Linh Quang Trảm', manaCost: 30, cooldown: 8,
    kind: 'damageArea', power: 35, radius: 2.2, center: 'hero',
    desc: 'Chém diện quanh nhân vật, 35 sát thương.',
  },
  kimHoaLienTram: {
    id: 'kimHoaLienTram', name: 'Kim Hỏa Liên Trảm', manaCost: 40, cooldown: 12,
    kind: 'damageArea', power: 60, radius: 1.6, center: 'nearestEnemy',
    desc: 'Chém mạnh vào nhóm quái gần nhất, 60 sát thương.',
  },
  hoiXuanThu: {
    id: 'hoiXuanThu', name: 'Hồi Xuân Thuật', manaCost: 35, cooldown: 20,
    kind: 'heal', power: 60, centerHeal: 40, radius: 0, center: 'hero',
    desc: 'Hồi 60 HP nhân vật và 40 HP trung tâm.',
  },
  thachGiapThu: {
    id: 'thachGiapThu', name: 'Thạch Giáp Thuật', manaCost: 25, cooldown: 18,
    kind: 'shield', power: 80, radius: 0, center: 'hero',
    desc: 'Tạo lá chắn 80 HP cho nhân vật.',
  },
  bangHoaBao: {
    id: 'bangHoaBao', name: 'Băng Hỏa Bạo', manaCost: 40, cooldown: 14,
    kind: 'damageArea', power: 45, radius: 2.5, center: 'hero', slowPct: 0.4, slowSec: 2,
    desc: 'Nổ quanh nhân vật 45 sát thương, làm chậm 40% trong 2s.',
  },
  thienKiemGiang: {
    id: 'thienKiemGiang', name: 'Thiên Kiếm Giáng', manaCost: 50, cooldown: 20,
    kind: 'damageArea', power: 120, radius: 2.5, center: 'nearestEnemy',
    desc: 'Thiên kiếm giáng xuống nhóm quái gần nhất, 120 sát thương.',
  },
  vanMocHoiSinh: {
    id: 'vanMocHoiSinh', name: 'Vạn Mộc Hồi Sinh', manaCost: 50, cooldown: 30,
    kind: 'heal', power: 120, centerHeal: 80, radius: 0, center: 'hero',
    desc: 'Hồi 120 HP nhân vật và 80 HP trung tâm.',
  },
  phanThienHoaVu: {
    id: 'phanThienHoaVu', name: 'Phần Thiên Hỏa Vũ', manaCost: 55, cooldown: 22,
    kind: 'damageArea', power: 90, radius: 5, center: 'hero',
    desc: 'Mưa lửa diện rộng quanh nhân vật, 90 sát thương.',
  },
  huyenBangPhongAn: {
    id: 'huyenBangPhongAn', name: 'Huyền Băng Phong Ấn', manaCost: 50, cooldown: 22,
    kind: 'damageArea', power: 40, radius: 4, center: 'hero', rootSec: 1.5,
    desc: '40 sát thương và trói mọi quái quanh nhân vật 1.5s.',
  },
  diaLietTran: {
    id: 'diaLietTran', name: 'Địa Liệt Trấn', manaCost: 50, cooldown: 20,
    kind: 'damageArea', power: 80, radius: 3, center: 'hero', stunSec: 0.8,
    desc: 'Chấn động đất quanh nhân vật, 80 sát thương, choáng 0.8s.',
  },
  // E2 — kỹ năng vòng 3 (bản đồ 2+)
  honNguyenTran: {
    id: 'honNguyenTran', name: 'Hỗn Nguyên Trấn', manaCost: 45, cooldown: 16,
    kind: 'damageArea', power: 70, radius: 3, center: 'hero',
    desc: 'Chấn động hỗn nguyên quanh nhân vật, 70 sát thương.',
  },
  kimThuyHanKiem: {
    id: 'kimThuyHanKiem', name: 'Kim Thủy Hàn Kiếm', manaCost: 45, cooldown: 14,
    kind: 'damageArea', power: 85, radius: 2, center: 'nearestEnemy', slowPct: 0.4, slowSec: 2,
    desc: 'Hàn kiếm chém nhóm quái gần nhất, 85 sát thương, chậm 40% trong 2s.',
  },
  mocHoaDuongSinh: {
    id: 'mocHoaDuongSinh', name: 'Mộc Hỏa Dưỡng Sinh', manaCost: 45, cooldown: 24,
    kind: 'heal', power: 90, centerHeal: 60, radius: 0, center: 'hero',
    desc: 'Hồi 90 HP nhân vật và 60 HP trung tâm.',
  },
  thoThuyAnDinh: {
    id: 'thoThuyAnDinh', name: 'Thổ Thủy An Định', manaCost: 40, cooldown: 22,
    kind: 'shield', power: 120, radius: 0, center: 'hero',
    desc: 'Tạo lá chắn 120 HP cho nhân vật.',
  },
  hoaKimPhanKich: {
    id: 'hoaKimPhanKich', name: 'Hỏa Kim Phản Kích', manaCost: 45, cooldown: 14,
    kind: 'damageArea', power: 95, radius: 1.8, center: 'nearestEnemy',
    desc: 'Phản kích vào nhóm quái gần nhất, 95 sát thương.',
  },
  // E2 — kỹ năng vòng 4 (bản đồ 3)
  thaiBachTuyetKiem: {
    id: 'thaiBachTuyetKiem', name: 'Thái Bạch Tuyệt Kiếm', manaCost: 60, cooldown: 24,
    kind: 'damageArea', power: 180, radius: 2.5, center: 'nearestEnemy',
    desc: 'Tuyệt kiếm giáng xuống nhóm quái gần nhất, 180 sát thương.',
  },
  thanhMocTruongTon: {
    id: 'thanhMocTruongTon', name: 'Thanh Mộc Trường Tồn', manaCost: 60, cooldown: 35,
    kind: 'heal', power: 180, centerHeal: 120, radius: 0, center: 'hero',
    desc: 'Hồi 180 HP nhân vật và 120 HP trung tâm.',
  },
  cuuThienPhanThe: {
    id: 'cuuThienPhanThe', name: 'Cửu Thiên Phần Thế', manaCost: 65, cooldown: 26,
    kind: 'damageArea', power: 150, radius: 5.5, center: 'hero',
    desc: 'Lửa trời thiêu đốt diện rất rộng quanh nhân vật, 150 sát thương.',
  },
  thaiAmDongKet: {
    id: 'thaiAmDongKet', name: 'Thái Âm Đóng Kết', manaCost: 60, cooldown: 26,
    kind: 'damageArea', power: 60, radius: 4.5, center: 'hero', rootSec: 2.5,
    desc: '60 sát thương và trói mọi quái quanh nhân vật 2.5s.',
  },
  honNguyenDiaTrao: {
    id: 'honNguyenDiaTrao', name: 'Hỗn Nguyên Địa Trào', manaCost: 60, cooldown: 24,
    kind: 'damageArea', power: 130, radius: 3.5, center: 'hero', stunSec: 1.2,
    desc: 'Địa trào quanh nhân vật, 130 sát thương, choáng 1.2s.',
  },
};
