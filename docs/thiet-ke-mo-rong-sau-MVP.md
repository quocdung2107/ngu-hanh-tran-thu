# NGŨ HÀNH TRẬN THỦ — Thiết kế mở rộng sau MVP (bản chờ duyệt)
*Ngày: 2026-11-24. MVP (2 vòng × 5 ô, 5 đợt) đã xong và đẩy lên GitHub: quocdung2107/ngu-hanh-tran-thu, commit 2f7e705.*
*Nguyên tắc giữ nguyên: mở rộng theo từng giai đoạn có nghiệm thu riêng, không làm một lần tất cả; mọi chỉ số/công thức vẫn nằm trong `src/config/`.*

## 1. Đánh giá MVP — khoảng trống lớn nhất

MVP đã chứng minh vòng lặp xây → đánh → mở khóa, nhưng có 3 khoảng trống khiến game chưa có chiều sâu chiến thuật thật:

1. **Ngũ hành mới chỉ là "màu + chỉ số"** — chưa có tương sinh/tương khắc giữa các trụ. Người chơi chưa có lý do xếp *vị trí* trụ, chỉ cần đủ *số lượng*. Đây là linh hồn của trận pháp ngũ hành mà MVP chưa chạm tới.
2. **Quái chỉ có 1 hành vi** (đi vào tâm, đánh vật cản gần) và 1 khung chỉ số cho 5 hệ — chưa có vai trò (tank/nhanh/bắn xa/hồi máu) và chưa có boss.
3. **Chưa có lý do chơi lại** — thắng 5 đợt là hết; không lưu trữ, không tiến triển dài hạn, không bản đồ thứ hai.

Lộ trình dưới đây xử lý đúng thứ tự đó: sâu cơ chế trước, rộng nội dung sau, tiến triển dài hạn cuối.

## 2. Giai đoạn E1 — "Tương Sinh Tương Khắc" (đề xuất làm NGAY tiếp theo)

Mục tiêu: biến việc *xếp vị trí* thành quyết định chiến thuật cốt lõi. Phạm vi khóa:

### 2.1 Tương sinh theo vòng (quy tắc mới, cần duyệt — E-D1)
- Trong một vòng, hai trụ **kề nhau** theo chiều Kim→Thủy→Mộc→Hỏa→Thổ→Kim (chuỗi tương sinh) thì cả hai được **+15% sát thương** (cộng dồn tối đa 2 phía = +30%). UI vẽ đường nối phát sáng giữa cặp tương sinh để người chơi nhìn thấy ngay.
- Cặp kề nhau theo chiều **tương khắc** (Kim khắc Mộc, Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim) thì trụ khắc được +10% sát thương, trụ bị khắc −10%. Rủi ro/hồi đáp rõ ràng.
- Công thức mở khóa chiêu (D1 cũ) **không đổi** — tương sinh/khắc là lớp cộng thêm, tính lại mỗi khi trụ sống/chết.

### 2.2 Nâng cấp trụ 3 cấp (E-D2)
- Trụ cấp 2: ×1.6 sát thương, +50% HP, giá = 60% giá xây. Cấp 3: ×2.5 sát thương, hiệu ứng phụ mạnh hơn (Mộc trói lâu hơn, Hỏa nổ to hơn...), giá = 120% giá xây. Phá trụ vẫn **không hoàn** tài nguyên (giữ luật MVP).
- Đây là sink tài nguyên chính giữa các đợt, thay cho việc chỉ xây thêm.

### 2.3 Quái đa vai trò + Boss đợt 5
- 4 vai trò dùng chung cho 5 hệ: **Tốc** (nhanh, ít máu), **Giáp** (chậm, nhiều máu, ưu tiên đánh trụ), **Xa** (đứng bắn trụ từ tầm 2.5 — buộc người chơi không thể chỉ thủ tâm), **Hồi** (hồi máu cho quái quanh, mục tiêu ưu tiên của người chơi).
- Đợt 5 thêm **Boss hệ của đợt** (HP ×12, to gấp đôi, miễn trói/choáng 50% thời gian), rơi nhiều tinh + 1 lần mở khóa ngẫu nhiên chưa? — không: boss chỉ rơi tài nguyên lớn, không đụng hệ thống mở khóa chiêu.
- Số đợt tăng 5 → **8 đợt** để có đất cho vai trò mới xuất hiện dần (đợt 2 có Tốc, đợt 3 có Giáp, đợt 4 có Xa, đợt 6 có Hồi).

### 2.4 Linh mạch (ô đặc biệt theo đợt)
- Mỗi đợt, 1–2 ô trụ ngẫu nhiên được đánh dấu **Linh Mạch**: trụ xây trên ô đó +25% sát thương trong đợt ấy. Báo từ giai đoạn xây dựng. Tạo lý do phá/xây lại thay vì giữ nguyên trận cả ván.

**Nghiệm thu E1:** test tương sinh/khắc (cặp kề, cộng dồn, mất khi trụ chết), test nâng cấp (giá/chỉ số), test quái Xa không áp sát, test boss miễn hiệu ứng, smoke trọn 8 đợt thắng được. Preview 1 file mới + đẩy GitHub như MVP.

## 3. Giai đoạn E2 — "Chiến dịch 3 bản đồ" (sau E1)

- 3 bản đồ theo đúng khung master prompt gốc: mỗi bản đồ khác **hình học trận** — Bản đồ 1 giữ 2 vòng tròn; Bản đồ 2 mở **vòng 3 (6 ô)** và cổng spawn tăng 4→6; Bản đồ 3 mở **vòng 4 (8 ô)**, tâm có 2 lớp HP.
- Mỗi bản đồ 8 đợt + boss riêng; thắng bản đồ mở bản đồ kế. Lưu tiến độ + trận hình mẫu (preset) vào **localStorage** (bản đồ, đợt cao nhất, preset theo bản đồ) — vẫn offline $0, chưa tài khoản/cloud.
- Lưu/chia sẻ trận hình bằng **mã văn bản** (giống cách Trận Pháp Nhân Quả chia sẻ trận hình): xuất mã từ trận hiện tại, dán mã để dựng lại.

## 4. Giai đoạn E3 — "Tiến triển dài hạn" (sau E2)

- **Cây Đạo Ngộ 12 nút** (ngoài ván, dùng điểm Đạo Ngộ kiếm từ thắng bản đồ): mở đầu ván thêm tài nguyên, giảm giá 1 hệ trụ, tăng HP tâm, mở ô linh mạch +1... Mỗi nút là dữ liệu config, hiệu ứng áp vào `balance` khi vào ván.
- **Chế độ Vô Tận** sau khi thắng bản đồ: đợt vô hạn, độ khó scale mũ nhẹ, bảng kỷ lục cá nhân lưu local (đợt cao nhất theo bản đồ).
- **Nhân vật điều khiển được (tùy chọn):** click để di chuyển trong bán kính hoạt động thay vì chỉ tự động — giữ chế độ tự động làm mặc định, đây là công tắc trong cài đặt, không đổi cân bằng.

## 5. Giai đoạn E4 — Hoàn thiện (sau E3, chỉ khi các giai đoạn trên đã nghiệm thu)

- Âm thanh tổng hợp bằng WebAudio (tiếng kiếm khí/hỏa cầu/tuyệt kỹ, nhạc nền vòng lặp nhẹ) — không cần file asset.
- Hiệu ứng hạt cho tuyệt kỹ, rung màn hình nhẹ khi tâm bị đánh, sprite vẽ tay đơn giản thay hình khối cho trụ/quái theo hệ.
- Chỉ số cân bằng tổng duyệt dựa trên dữ liệu chơi thử thật của người dùng ở E1–E3.

## 6. Những thứ CỐ Ý vẫn không làm
Multiplayer/PvP, gacha, cửa hàng tiền thật, tài khoản/cloud save, cốt truyện dài — giữ đúng danh sách loại trừ của master prompt cho tới khi người dùng chủ động mở lại.

## 7. Việc cần người dùng quyết
1. Duyệt E1 làm giai đoạn tiếp theo, hay ưu tiên E2 (nhiều bản đồ) trước E1 (sâu cơ chế)? — Đề xuất: **E1 trước**, vì tương sinh/khắc là linh hồn ngũ hành; thêm bản đồ mà cơ chế vẫn nông thì chỉ dài hơn chứ không hay hơn.
2. E-D1: tương sinh/khắc tính theo **trụ kề nhau trong vòng** (đề xuất) hay theo **toàn vòng không tính vị trí** (đơn giản hơn nhưng mất yếu tố xếp chỗ)?
3. E-D2: nâng cấp trụ tối đa **3 cấp** (đề xuất) hay 5 cấp?
Chỉ cần trả lời 3 ý trên (hoặc nói "duyệt tất cả theo đề xuất, code E1") là triển khai được ngay.
