# NGŨ HÀNH TRẬN THỦ — E6 "TRẬN THỦ BẢN ĐỒ LỚN" (yêu cầu người dùng 2026-11-25)

## 1. Ý người dùng, chốt thành cấu trúc rõ ràng
- **Dã Chiến là một map/chế độ riêng** — giữ nguyên như E5, không đụng vào.
- **Chế độ Ngũ Hành Trận (thủ trận) là một map/chế độ riêng** — và chế độ này phải có **bản đồ và lối chơi giống Dã Chiến**: bản đồ lớn hơn khung hình, camera di chuyển theo nhân vật, nhân vật đi lại tự do, quái cùng kích thước nhân vật và kéo tới theo đàn.
- Nhưng chế độ thủ trận **vẫn tuân thủ đầy đủ quy tắc Ngũ Hành Trận Thủ**: trận pháp tròn đồng tâm ở tâm bản đồ, xây/phá trụ theo 2 giai đoạn, công thức mở khóa chiêu (D1), tuyệt kỹ vòng (D2), quái phá trụ theo tầm bám (D4), tương sinh/khắc theo trụ kề, nâng cấp trụ, Linh Mạch, rơi tài nguyên đúng hệ, thắng/thua theo đợt và HP tâm/nhân vật.

Nói ngắn gọn: E6 = *khung di chuyển/camera/bản đồ của Dã Chiến* + *toàn bộ luật thủ trận hiện có*. Không đổi luật, chỉ đổi sân khấu và cách di chuyển.

## 2. Thay đổi cụ thể
1. **Bản đồ thủ trận thành bản đồ lớn** (trong config từng map): Map 1: 60×60, Map 2: 70×70, Map 3: 80×80 đơn vị. Trận pháp nằm ở **tâm bản đồ**; bán kính các vòng giữ tỉ lệ như hiện tại (quái cỡ 0.9 đi lọt giữa các vòng như nhân vật).
2. **Camera theo nhân vật** trong chế độ thủ trận, dùng lại camera của Dã Chiến (bám mượt + kẹp biên bản đồ). Khung hình chỉ còn thấy một phần bản đồ — đây là chủ đích.
3. **Nhân vật đi tự do toàn bản đồ** ở cả 2 giai đoạn: WASD/phím mũi tên + click-to-move (dùng lại điều khiển của Dã Chiến). **Bỏ giới hạn bán kính hoạt động 6 đơn vị quanh tâm** của các bản trước — thay đổi này phải ghi rõ trong README vì nó sửa một luật cũ. Nhân vật vẫn tự đánh quái trong tầm như hiện tại.
4. **Xây trận trên bản đồ lớn**: ở giai đoạn xây dựng, người chơi di chuyển nhân vật/camera tới khu vực trận (ở tâm), click ô trụ để chọn và xây như cũ (click phải tính đúng qua phép biến đổi camera). Thêm nút + phím tắt **"Về tâm trận" (phím T)** đưa nhân vật về tâm ngay, để không mất thời gian chạy về. Giai đoạn chiến đấu vẫn khóa xây/phá như luật cũ.
5. **Quái spawn ở cổng tại biên bản đồ** (số cổng theo map như cũ: 4/6/cổng của map 3) và **hành quân qua bản đồ lớn về tâm trận**, thành đàn theo đợt như luật đợt hiện tại. Quãng đường dài hơn → trụ và nhân vật có đất đánh chặn giữa đường; nhân vật có thể ra xa đón đánh hoặc ở lại giữ tâm — đó là lựa chọn chiến thuật mới mà E6 tạo ra.
6. **Render**: chế độ thủ trận chuyển sang cùng khung render theo lớp + SpriteRegistry của E5 (nền → groundFx → bóng → entity xếp theo Y → đạn → fx), có culling theo khung hình; trụ được cấp spriteId riêng (`tower-kim`...) để sau này chồng hình thật. Không thay đổi hình thức placeholder ở giai đoạn này.

## 3. Giữ nguyên tuyệt đối (luật Ngũ Hành Trận Thủ)
D1 công thức theo số lượng trong vòng + mở khóa vĩnh viễn; D2 tuyệt kỹ vòng (≥3 trụ sống, scale 60/80/100%, cooldown riêng); D4 tầm bám phá trụ 1.1; tương sinh/khắc kề nhau; nâng cấp 3 cấp, phá không hoàn; Linh Mạch theo đợt; hệ đợt báo trước; rơi tinh đúng hệ; 8 đợt + boss đợt 8; thắng khi qua hết đợt, thua khi HP tâm = 0 hoặc HP nhân vật = 0; bản đồ 3 tâm 2 lớp HP; Đạo Ngộ, Vô Tận, mã trận hình, lưu tiến độ — tất cả giữ nguyên, chỉ chạy trên sân khấu mới.

## 4. Cân bằng lại (bắt buộc, có test)
- Người chơi mẫu (test) phải được nâng cấp thành *người chơi biết đi lại*: xây trận ở tâm, khi đánh thì tuần tra giữa tâm và cụm quái gần nhất. Cả 3 map phải thắng được bằng người chơi mẫu nhưng không trivial (tâm mất HP hoặc nhân vật mất máu đáng kể ở map 2/3), chỉnh số trong config (tốc độ quái/nhịp spawn/giá trị đợt) nếu cần và ghi lại trong README.
- Test cũ nào dựa trên giả định "nhân vật bị giữ trong bán kính 6" hoặc "camera tĩnh toàn cảnh" thì cập nhật theo luật mới và liệt kê trong báo cáo — không lặng lẽ sửa.

## 5. Nghiệm thu E6
- Test mới: camera thủ trận bám nhân vật + kẹp biên ở 4 góc bản đồ; nhân vật ra khỏi bán kính 6 cũ và bị kẹp ở biên bản đồ; click chọn ô trụ đúng tọa độ khi camera đã lệch khỏi tâm; quái spawn ở biên và tới được vùng tâm trong sim; smoke/balance 3 map trên sân khấu mới.
- Toàn bộ test còn lại (sau khi cập nhật các test dính luật cũ) pass; build pass; preview 1 file cập nhật; commit "E6: ..." và đẩy GitHub.
