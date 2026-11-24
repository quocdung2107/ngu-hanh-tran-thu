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
];
