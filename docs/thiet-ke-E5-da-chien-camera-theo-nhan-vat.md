# NGŨ HÀNH TRẬN THỦ — E5 "DÃ CHIẾN" (theo ảnh tham chiếu người dùng gửi 2026-11-25)
*Hướng mới: camera di chuyển theo nhân vật, bản đồ lớn, quái cùng kích thước với nhân vật và kéo tới thành bầy — kiểu chơi "một mình giữa vòng vây" như ảnh quảng cáo game Tiên Nghịch người dùng gửi.*

## 1. Quyết định khung (ghi rõ để không hiểu nhầm)
- E5 là **một chế độ chơi MỚI tên "Dã Chiến"**, thêm vào menu chọn chế độ, **không thay thế** chế độ thủ trận pháp hiện có (đó vẫn là cốt lõi của game). Người chơi chọn chơi thủ trận hoặc dã chiến. Nếu sau khi chơi thử người dùng muốn chuyển hẳn game sang hướng dã chiến, đó là quyết định riêng ở bước sau.
- **Chưa vội đồ họa**: mọi thực thể vẽ bằng hình khối/placeholder như hiện tại. Điều quan trọng ở E5 là *kiến trúc mở theo lớp* (§4) để sau này chồng hình ảnh thật (nhân vật, quái, nền bản đồ) lên mà **không sửa code gameplay**.

## 2. Gameplay Dã Chiến
- **Bản đồ lớn 80×80 đơn vị** (so với khung nhìn chỉ ~18×13) — nhân vật đi lại tự do, vấp biên bản đồ thì dừng.
- **Camera đi theo nhân vật**: bám mượt (lerp), kẹp trong biên bản đồ; nhân vật luôn gần giữa màn hình như ảnh tham chiếu.
- **Nhân vật điều khiển trực tiếp**: WASD/phím mũi tên để chạy, click chuột cũng ra lệnh chạy tới; tự động tấn công quái gần nhất bằng **chùm đạn nhiều tia** (như ảnh: đạn tỏa nhiều hướng vào bầy quái), cộng 3 kỹ năng chủ động sẵn có (phím 1/2/3 hoặc nút bấm): nổ diện quanh thân, mưa kiếm diện rộng, hồi máu — mana + cooldown như hệ kỹ năng hiện có.
- **Quái cùng kích thước với nhân vật** (~0.9 đơn vị; tinh anh 1.4, boss 1.8): spawn thành **bầy** ở ngoài khung hình xung quanh nhân vật, lao vào vây; số lượng tăng dần theo thời gian (mốc 30 giây), trần ~120 quái sống cùng lúc để giữ FPS. Quái chạm vào gây sát thương theo nhịp đánh; 5 hệ ngũ hành như cũ, màu theo hệ.
- **Rơi đồ nhặt được**: quái chết rơi Linh Thạch + tinh đúng hệ, vật phẩm nằm trên đất, nhân vật đi gần thì **hút về** (magnet) như game trong ảnh.
- **Điều kiện kết thúc**: sống sót 5 phút = thắng màn dã chiến; HP về 0 = thua. Màn hình kết quả: thời gian sống, số quái đã diệt, tài nguyên nhặt được. Tài nguyên nhặt được **cộng vào kho chung** hiển thị ở menu (chỉ hiển thị/ghi nhận ở mức phiên chơi, chưa làm kinh tế liên thông sâu — để giai đoạn sau nếu người dùng muốn).

## 3. Hiệu năng
- Chỉ mô phỏng/vẽ thực thể trong hoặc gần khung hình (culling theo camera); quái ở xa vẫn đuổi theo nhưng không vẽ chi tiết.
- Sim vẫn thuần TS, tick 20Hz, tách khỏi render như mọi module hiện có; mọi con số (cỡ bản đồ, tốc độ spawn, trần quái, sát thương...) nằm trong `src/config/field.ts`.

## 4. Kiến trúc render theo lớp + SpriteRegistry (phần "để mở" quan trọng nhất)
Thứ tự vẽ cố định, khai báo thành hằng số có test:
1. `ground` — nền bản đồ (ô lưới + mảng trang trí placeholder, chỉ vẽ phần trong khung hình)
2. `groundFx` — vòng kỹ năng trên đất, vùng nổ, vật phẩm rơi
3. `shadow` — bóng thực thể
4. `entity` — nhân vật + quái + trụ, **sắp xếp theo Y** (đứng dưới vẽ sau → chồng lớp đúng chiều sâu)
5. `projectile` — đạn
6. `fx` — hạt, số sát thương bay

Mỗi thực thể chỉ khai báo `spriteId` (ví dụ `hero`, `enemy-kim`, `enemy-thuy`, `boss-hoa`, `tile-ground`). `SpriteRegistry` tra cứu theo manifest:
- Có file ảnh trong manifest → vẽ ảnh (neo chân, tỉ lệ theo config).
- Không có → vẽ hình khối placeholder theo màu hệ như hiện tại.
Manifest là một file dữ liệu (`src/config/sprites.ts`, sau này có thể nạp JSON + thư mục `assets/sprites/`). **Hệ quả: sau này người dùng đưa hình nhân vật/quái/bản đồ thật, chỉ cần thêm file + 1 dòng manifest là game dùng ngay, không sửa logic hay renderer.**

## 5. Nghiệm thu E5
- Test: camera bám + kẹp biên; spawn ngoài khung hình và trần số quái; quái cùng cỡ (hằng số kích thước); hút vật phẩm; thắng ở 5 phút / thua khi HP 0 (sim headless với nhân vật tự chạy mẫu phải diệt được quái và sống qua ít nhất 60 giây mô phỏng); thứ tự lớp vẽ + fallback sprite khi manifest trống; **toàn bộ 64 test cũ vẫn pass**.
- Build pass, preview 1 file cập nhật, commit riêng "E5: ..." rồi đẩy GitHub như thường lệ.
