# Nhập toàn văn website tham khảo

## Kết quả nhập 15/10/2026

Nguồn: [Bộ môn Tài nguyên Đất đai](https://lrd.ctu.edu.vn/). Lần nhập này thay phần thân tóm lược của lần seed đầu bằng **toàn văn bài gốc**, giữ ID, slug và lịch sử CMS của các bài đã có.

| Nội dung                                        | Số lượng | Quản trị                               |
| ----------------------------------------------- | -------: | -------------------------------------- |
| Bài toàn văn                                    |       97 | `/admin/content`                       |
| Ảnh khác nhau theo SHA-256                      |      115 | `/admin/media`                         |
| Vị trí ảnh trong thân bài, gồm biểu tượng nhỏ   |      131 | Trình soạn thảo                        |
| Bảng nội dung                                   |      111 | Trình soạn thảo                        |
| Chương trình / thông báo tuyển sinh có cấu trúc |    4 / 4 | `/admin/programs`, `/admin/admissions` |
| Chuyển hướng URL cũ                             |      134 | Next.js, HTTP 301                      |

Quét 156 URL, bao gồm các trang phân trang, bài cũ và hồ sơ giảng viên. 119 URL bài có nội dung được ánh xạ về 97 bài, gộp các URL trùng thân bài và ảnh. Thêm một URL hội thảo cũ bị 404 được nối đến bài tương ứng còn truy cập được, tổng cộng 120 URL trong bản đồ bài nguồn. Có 117 tham chiếu tệp ảnh trong gói; hai cặp trùng bytes dùng chung media asset. Ảnh nguồn đóng gói khoảng 69,2 MiB. API Media kiểm tra, mã hóa lại và áp dụng giới hạn cạnh dài 2400px hiện có khi tạo ảnh phục vụ website; bản nguồn đầy đủ vẫn nằm trong `assets/`.

Bộ kiểm tra đối chiếu **562.043 ký tự sau khi bỏ khác biệt khoảng trắng**, thứ tự nội dung, liên kết và đủ vị trí ảnh giữa bản HTML nguồn đã lưu với JSON nhập. Tóm tắt vẫn là trường riêng dùng ở danh sách, không thay thân bài.

Danh mục nghiên cứu, hồ sơ nhân sự, tư liệu, bảng kết quả và các chùm ảnh đều có nội dung đầy đủ trong Publishing. Các domain Directory/Research riêng vẫn thuộc giai đoạn sau. PDF/DOCX/ZIP giữ liên kết trong bài đến đơn vị phát hành; lần này không sao chép kho tệp đính kèm.

## CMS được bổ sung

- Bảng: chèn bảng, thêm/xóa hàng và cột, hàng tiêu đề, gộp/tách ô; giữ `rowspan`, `colspan` qua lưu, preview, publish và restore.
- Đề mục H2–H6, căn lề, chỉ số trên/dưới, danh sách đánh số và định dạng văn bản.
- Ảnh trong bài: sửa mô tả, chú thích và liên kết khi bấm ảnh. Biểu tượng nhỏ giữ dạng ảnh trong dòng.
- Nguồn bài: URL, tác giả nếu nguồn có, ngày đăng gốc, ngày đối chiếu. Ngày gốc dùng ở trang bài/danh sách và thứ tự tin; thời điểm publish/audit vẫn là thời điểm thao tác thật.
- Thư viện và bộ chọn ảnh: tìm theo tên tệp, nút xem thêm; API phân trang tối đa 60 ảnh/lần, vẫn giữ giới hạn quyền sở hữu.
- Bảng public cuộn ngang trong vùng riêng trên điện thoại.
- Academics có liên kết **Nội dung bài gốc đầy đủ**, bên cạnh dữ liệu mã ngành/lịch tuyển đã đối chiếu. URL bài nội bộ được kiểm tra theo mẫu `/vi|en/tin-tuc/<slug>`.

Kiến trúc giữ Publishing domain/application độc lập Spring; `RichDocument` kiểm tra loại node, kích thước bảng, span, URL ảnh và tham chiếu asset. `ContentOrigin` thuộc snapshot bài. Discovery nhận ngày nguồn qua port API; Flyway V6 thêm `source_published_on` vào projection. Media thêm phân trang qua application port/repository. Không đưa HTML tùy ý vào renderer.

## Dữ liệu và quy trình

- `data/reference-site/manifest.json`: JSON nội dung, nguồn, tham chiếu asset, SHA-256 và vấn đề nguồn.
- `data/reference-site/source/index.json`: kiểm kê 156 URL, ngày nguồn, hash thân bài và tình trạng truy cập.
- `data/reference-site/source/*.html`: phần thân nguồn để đối chiếu, đã loại script/style/noscript và thành phần điều hướng. Không phục vụ các tệp này như HTML public.
- `data/reference-site/source-aliases.json`: URL cũ bị lỗi đã đối chiếu với bài thay thế và trang nguồn làm bằng chứng.
- `data/reference-site/full-coverage.json`: hash văn bản, số ảnh/liên kết từng bài, URL tương đương, mục không nhập.
- `data/reference-site/format-report.json`: kiểm kê sửa định dạng cho từng bài và tổng số thao tác.
- `data/reference-site/assets/`: ảnh nguồn; ảnh nhúng base64 cũng được tách và upload vào Media.
- `data/reference-site/inventory.json`: kiểm kê 84 URL của lần đầu, giữ để tương thích mã tham chiếu cũ.
- `scripts/reference/source.mjs`: chuyển HTML thành node được allowlist; giải mã email Joomla từ chuỗi literal, không chạy JavaScript nguồn.
- `scripts/reference/format.mjs`: chuẩn hóa khoảng trắng, ngắt đoạn và phân cấp đề mục sau khi chuyển HTML.
- `scripts/reference/verify-package.mjs`: so sánh lại toàn bộ bản nhập với snapshot trước khi seed.

Thứ tự văn bản, bảng, ô gộp, danh sách, ảnh và link được giữ. Font/màu inline cũ dùng design system hiện tại. Lượt chuẩn hóa định dạng trên 97 bài sửa 7.861 text node có khoảng trắng bất thường, tách 21 đoạn nhiều dòng, đưa 15 H2 dùng làm đoạn/gạch đầu dòng về thân bài và phục hồi 280 đề mục từ nhãn in đậm. Các dòng gạch đầu dòng gõ tay được căn lề thống nhất. Nội dung chữ vẫn được đối chiếu theo hash sau khi bỏ khác biệt khoảng trắng; không tự dịch hay viết lại câu chữ nguồn. Tóm tắt tạo tự động được rút về tối đa 200 ký tự; hồ sơ nhân sự dùng câu giới thiệu ngắn thay đoạn lý lịch trích thô có địa chỉ/số điện thoại. Liên kết bài đã chuyển được đổi sang URL nội bộ; liên kết tài liệu/ngoài website giữ URL đầy đủ.

Gói đã áp dụng lại qua CMS API với `--update-if-unchanged --skip-site`: 79 bài có thay đổi cấu trúc được xuất bản lại, 40 bài có tóm tắt tạo tự động được cập nhật, không có xung đột. Bản người dùng đã sửa trong CMS được seed bảo vệ bằng version và ledger. Trang bài dùng cùng renderer cho public và preview CMS; mục lục bám khi đọc bài dài. Kiểm tra trình duyệt mở đủ 97 URL ở chiều rộng 390px, không có tràn ngang hoặc đoạn thân bài lớn hơn cỡ chữ chuẩn.

## Chạy lại

Yêu cầu Node 22+, `npm ci`, Docker app đang chạy và tài khoản Admin trong `.env` (`LRD_ADMIN_EMAIL`, `LRD_ADMIN_PASSWORD`). Mặc định `SEED_BASE_URL=http://localhost:8088`.

```bash
npm run seed:check
npm run test:import
npm run seed:reference
```

Để nâng cấp bản seed cũ bằng gói toàn văn, giữ cấu hình Home/Menu đang sử dụng:

```bash
node --env-file=.env scripts/reference/seed.mjs --apply --update-if-unchanged --skip-site
```

Seed đi qua API đăng nhập/CSRF/phân quyền, không ghi SQL. Nội dung đã sửa trong CMS được giữ và báo xung đột. Sổ theo dõi ở `.runtime/reference-seed/<hash-origin>/state.json`; giữ sổ để tiếp tục và tránh tạo trùng. Mỗi bước tạo/lưu/đăng có checkpoint. Không xóa sổ để ép cập nhật. `--skip-site` bỏ qua Home/Menu, phù hợp cập nhật nội dung nguồn sau khi đã cấu hình website.

### Bản biên tập trang giới thiệu bộ môn

`scripts/reference/reformat-about.mjs` là bước biên tập sau seed dành riêng cho bài “Giới thiệu Bộ môn Tài nguyên đất đai”. Script sắp lại 6 phần nội dung, chuyển gạch đầu dòng thành danh sách, giữ ảnh và dữ liệu gốc trong lịch sử CMS, sửa liên kết email và nhãn “Giới thiệu bộ môn” ở menu. Chạy không tham số để xem đề mục; thêm `--apply` để lưu và đăng qua CMS API. Script từ chối ghi đè khi bài hoặc menu có thay đổi nháp chưa công khai. Bản trước khi sửa được lưu ở `.runtime/about-reformat/`.

```bash
node --env-file=.env scripts/reference/reformat-about.mjs --apply
```

Manifest nguồn vẫn giữ nguyên để `seed:check` đối chiếu chính xác bản gốc. Không dùng `seed:reference --update-if-unchanged` để phục hồi bản biên tập này từ manifest; khi cần, chạy lại script biên tập sau seed.

Gói không đổi không tạo thêm ảnh, bài hoặc revision. Nếu gói đổi giữa một lần nhập bị gián đoạn ở bước lưu nháp, seed báo xung đột để kiểm tra nháp trước khi đăng. `running.lock` ngăn chạy hai tiến trình; chỉ gỡ sau khi xác nhận tiến trình cũ đã dừng. Nếu mất kết nối ngay sau tạo trước checkpoint, rà soát tài nguyên chưa được ghi nhận. Không bỏ qua xung đột hay tự xóa dữ liệu CMS.

Để lấy lại nguồn mới, rà soát thay đổi rồi mới áp dụng:

```bash
npm run seed:capture
# Chỉ thử lại các URL chưa lấy thành công:
node scripts/reference/capture.mjs --resume
npm run seed:prepare-full
npm run seed:assets
npm run seed:check
npm run test:import
```

Trình tải ảnh chỉ truy cập host nguồn và `static.xx.fbcdn.net` cho biểu tượng nằm trong bài. Tệp có hash đã xác nhận không được thay âm thầm nếu bytes nguồn đổi. URL sai được sửa chỉ khi có tài nguyên đối chiếu, ghi `resolvedUrl` và `resolutionNote`.

## Những điểm không thể chuyển nguyên trạng

Danh sách máy đọc được nằm ở `full-coverage.json → skipped`:

- URL rút gọn của hội thảo Công nghiệp 4.0 năm 2021 trả HTTP 404. Đã tìm được bài đầy đủ ở URL khác trong cùng danh mục hội thảo, nhập toàn văn và thêm chuyển hướng từ URL lỗi; bằng chứng trong `source-aliases.json`, kết quả trong `full-coverage.json → recovered`.
- Bài “Kiểm định chất lượng AUN-QA ngành QLĐĐ”: thân bài nguồn rỗng.
- Trang Chuyển giao công nghệ và ba URL “Underconstruction”: nguồn còn nội dung mẫu/chưa hoàn thiện.
- Một URL ảnh trao đổi sinh viên thiếu dấu `/` giữa thư mục và tên tệp: dùng đúng đường dẫn cùng tên đang có trong chính bài nguồn, tải thành công; cả hai vị trí ảnh được giữ.

Thông tin lịch sử trong toàn văn được giữ nguyên, kể cả mã cũ/năm không nhất quán ở nguồn. Academics vẫn dùng mã/chỉ tiêu đã đối chiếu: 7850103/130, 7580105/75, 8850103/15, 9850103/5. Không tự đoán lịch còn thiếu hay ngày hiệu lực AUN-QA. Thiếu lịch tuyển sinh dùng `NOTICE`; biết hạn và đã qua hạn dùng `CLOSED`. Home chọn `LATEST` để tra cứu các mùa đã kết thúc.

## Kiểm tra và vận hành

```bash
npm run test:api
npm run test:import
npm run typecheck
E2E_BASE_URL=http://localhost:8088 E2E_REFERENCE_DATA=1 npm run test:e2e
```

PowerShell đặt `$env:E2E_BASE_URL = 'http://localhost:8088'` và `$env:E2E_REFERENCE_DATA = '1'` trước khi chạy E2E. Chỉ bật kiểm tra nguồn khi database đã nhập gói này.

Lượt chuẩn hóa hiện tại chạy thành công **5 test importer và 17 test E2E** trên bản Docker; 39 test backend đã đạt ở lần nhập toàn văn trước và không có thay đổi backend trong lượt này. Importer đối chiếu cả gói, kiểm tra cấu trúc theo schema trình soạn thảo và quy tắc ngắt đoạn/đề mục. E2E kiểm tra toàn văn/ảnh tất cả bài, từng trang của 97 bài ở 390px, 134 redirect, thư viện quá 60 ảnh, tìm ảnh, sửa bảng/chú thích/ngày nguồn, CMS đào tạo/tuyển sinh, tài khoản/quyền, Site, đăng bài, slider/cuộn/reduced motion, xung đột và responsive. Tài nguyên E2E được ghi riêng theo ID; dọn đúng các ID đó, không reset database hay volume.

Chạy lại seed sau khi nhập trả về **0 tài nguyên mới, 0 phiên bản mới, 0 xung đột**. Đã dọn các ID dữ liệu test, giữ 97 bài, 115 ảnh, 4 chương trình và 4 tuyển sinh.

Bản SQL trước nâng cấp được giữ tại `.runtime/before-full-import.sql` trên máy chạy. Lịch sử CMS giữ phiên bản tóm lược cũ để đối chiếu/khôi phục khi cần.
