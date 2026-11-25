// E6 — Camera bám theo nhân vật DÙNG CHUNG cho cả hai chế độ:
//   - Dã Chiến (E5): thế giới 0..80, camera là tâm khung nhìn.
//   - Thủ trận (E6): thế giới tâm (0,0), cạnh theo bản đồ (60/70/80).
// Thuật toán một chỗ duy nhất: đích = vị trí nhân vật kẹp trong biên cho phép,
// camera lerp mượt về đích rồi kẹp lại — không bao giờ lộ ra ngoài bản đồ.
import { DEFENSE_CAM_LERP, DEFENSE_CAM_MARGIN } from '../config/balance';
import { FIELD } from '../config/field';
import type { GameState } from './state';

export interface CameraState { x: number; y: number }
export interface CameraBounds { minX: number; maxX: number; minY: number; maxY: number }

export const clampNum = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Kẹp một điểm đích camera vào trong biên cho phép. */
export function clampCameraTarget(tx: number, ty: number, b: CameraBounds): { x: number; y: number } {
  return { x: clampNum(tx, b.minX, b.maxX), y: clampNum(ty, b.minY, b.maxY) };
}

/** Một bước camera: lerp mượt về đích (đã kẹp) rồi kẹp vị trí camera. */
export function stepFollowCamera(
  cam: CameraState, tx: number, ty: number, dt: number, lerp: number, b: CameraBounds,
): void {
  const t = clampCameraTarget(tx, ty, b);
  const k = Math.min(1, lerp * dt);
  cam.x += (t.x - cam.x) * k;
  cam.y += (t.y - cam.y) * k;
  cam.x = clampNum(cam.x, b.minX, b.maxX);
  cam.y = clampNum(cam.y, b.minY, b.maxY);
}

// ===== Thủ trận (E6) =====

/** Biên camera thủ trận theo cạnh bản đồ: tâm (0,0), chừa lề DEFENSE_CAM_MARGIN mỗi phía. */
export function defenseCameraBounds(worldSize: number): CameraBounds {
  const h = Math.max(0, worldSize / 2 - DEFENSE_CAM_MARGIN);
  return { minX: -h, maxX: h, minY: -h, maxY: h };
}

/** Đích camera thủ trận: vị trí nhân vật đã kẹp trong biên camera của bản đồ. */
export function defenseCameraTarget(state: GameState): { x: number; y: number } {
  return clampCameraTarget(state.hero.x, state.hero.y, defenseCameraBounds(state.map.worldSize));
}

/** Cập nhật camera thủ trận một tick (bám nhân vật). */
export function updateDefenseCamera(state: GameState, dt: number): void {
  stepFollowCamera(
    state.camera, state.hero.x, state.hero.y, dt,
    DEFENSE_CAM_LERP, defenseCameraBounds(state.map.worldSize),
  );
}

// ===== Dã Chiến (E5) — giữ nguyên hành vi, dùng lại helper chung =====

export function fieldCameraBounds(): CameraBounds {
  return {
    minX: FIELD.viewW / 2, maxX: FIELD.worldW - FIELD.viewW / 2,
    minY: FIELD.viewH / 2, maxY: FIELD.worldH - FIELD.viewH / 2,
  };
}
