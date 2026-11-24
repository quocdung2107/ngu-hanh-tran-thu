import type { Element } from './balance';

export interface RecipeDef {
  id: string;
  ring: number; // 0 = vòng 1, 1 = vòng 2
  name: string;
  requires: Partial<Record<Element, number>>; // D1: số lượng theo hệ trong vòng, không tính thứ tự
  skillId: string;
}

// D1: công thức là multiset số lượng theo hệ TRONG một vòng; 1 trụ tính cho mọi
// công thức của chính vòng đó, không tính sang vòng khác.
export const RECIPES: RecipeDef[] = [
  // Vòng 1 — hỗn hợp
  { id: 'r1-ngu-hanh', ring: 0, name: 'Ngũ Hành Quy Nguyên', requires: { kim: 1, moc: 1, thuy: 1, hoa: 1, tho: 1 }, skillId: 'linhQuangTram' },
  { id: 'r1-kim-hoa', ring: 0, name: 'Kim Hỏa Kiếm Trận', requires: { kim: 3, hoa: 2 }, skillId: 'kimHoaLienTram' },
  { id: 'r1-moc-thuy', ring: 0, name: 'Mộc Thủy Sinh Linh', requires: { moc: 3, thuy: 2 }, skillId: 'hoiXuanThu' },
  { id: 'r1-tho-kim', ring: 0, name: 'Thổ Kim Trấn Thủ', requires: { tho: 3, kim: 2 }, skillId: 'thachGiapThu' },
  { id: 'r1-thuy-hoa', ring: 0, name: 'Thủy Hỏa Kích Đãng', requires: { thuy: 3, hoa: 2 }, skillId: 'bangHoaBao' },
  // Vòng 2 — thuần hệ (5 trụ cùng hệ)
  { id: 'r2-kim', ring: 1, name: 'Canh Kim Thiên Kiếm', requires: { kim: 5 }, skillId: 'thienKiemGiang' },
  { id: 'r2-moc', ring: 1, name: 'Vạn Mộc Sinh Linh', requires: { moc: 5 }, skillId: 'vanMocHoiSinh' },
  { id: 'r2-hoa', ring: 1, name: 'Phần Thiên Thuần Hỏa', requires: { hoa: 5 }, skillId: 'phanThienHoaVu' },
  { id: 'r2-thuy', ring: 1, name: 'Huyền Băng Thuần Thủy', requires: { thuy: 5 }, skillId: 'huyenBangPhongAn' },
  { id: 'r2-tho', ring: 1, name: 'Địa Mạch Thuần Thổ', requires: { tho: 5 }, skillId: 'diaLietTran' },
  // E2 — Vòng 3 (6 ô, chỉ có ở bản đồ 2+) — hỗn hợp, vẫn yêu cầu tổng 5 trụ; ô thứ 6 là ô dự phòng.
  { id: 'r3-hon-nguyen', ring: 2, name: 'Hỗn Nguyên Ngũ Hành', requires: { kim: 1, moc: 1, thuy: 1, hoa: 1, tho: 1 }, skillId: 'honNguyenTran' },
  { id: 'r3-kim-thuy', ring: 2, name: 'Kim Thủy Hàn Kiếm', requires: { kim: 3, thuy: 2 }, skillId: 'kimThuyHanKiem' },
  { id: 'r3-moc-hoa', ring: 2, name: 'Mộc Hỏa Dưỡng Sinh', requires: { moc: 3, hoa: 2 }, skillId: 'mocHoaDuongSinh' },
  { id: 'r3-tho-thuy', ring: 2, name: 'Thổ Thủy An Định', requires: { tho: 3, thuy: 2 }, skillId: 'thoThuyAnDinh' },
  { id: 'r3-hoa-kim', ring: 2, name: 'Hỏa Kim Phản Kích', requires: { hoa: 3, kim: 2 }, skillId: 'hoaKimPhanKich' },
  // E2 — Vòng 4 (8 ô, chỉ có ở bản đồ 3) — thuần hệ, yêu cầu 5 trụ cùng hệ; 3 ô còn lại là dự phòng.
  { id: 'r4-kim', ring: 3, name: 'Thái Bạch Thuần Kim', requires: { kim: 5 }, skillId: 'thaiBachTuyetKiem' },
  { id: 'r4-moc', ring: 3, name: 'Thanh Mộc Thuần Sinh', requires: { moc: 5 }, skillId: 'thanhMocTruongTon' },
  { id: 'r4-hoa', ring: 3, name: 'Cửu Thiên Thuần Hỏa', requires: { hoa: 5 }, skillId: 'cuuThienPhanThe' },
  { id: 'r4-thuy', ring: 3, name: 'Thái Âm Thuần Thủy', requires: { thuy: 5 }, skillId: 'thaiAmDongKet' },
  { id: 'r4-tho', ring: 3, name: 'Hỗn Nguyên Thuần Thổ', requires: { tho: 5 }, skillId: 'honNguyenDiaTrao' },
];

export interface RingUltDef {
  ring: number;
  name: string;
  cooldown: number;
  dmg: number;
  stunSec: number;
}

// Tuyệt kỹ AoE riêng của mỗi vòng (D2) — tách hẳn với đòn đánh riêng của trụ.
export const RING_ULTS: RingUltDef[] = [
  { ring: 0, name: 'Ngũ Hành Lôi', cooldown: 12, dmg: 45, stunSec: 0 },
  { ring: 1, name: 'Thiên Địa Trấn', cooldown: 18, dmg: 80, stunSec: 0.5 },
  { ring: 2, name: 'Lục Hợp Chấn', cooldown: 16, dmg: 110, stunSec: 0 },
  { ring: 3, name: 'Vạn Pháp Quy Tông', cooldown: 22, dmg: 160, stunSec: 0.8 },
];
