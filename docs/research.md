# Nghiên cứu, học liệu và menu

## Mô hình dữ liệu

`research` là một domain riêng theo kiến trúc lục giác. Aggregate `ResearchRecord` chứa loại (`PROJECT`, `JOURNAL_ARTICLE`, `CONFERENCE_PAPER`, `TEXTBOOK`, `DOCUMENT`), bản nháp, bản công khai, version và thời điểm xuất bản. `ResearchDetails` giữ tiêu đề, slug, tóm tắt, năm, nơi công bố/nhà xuất bản, DOI/ISBN, cấp và tiến độ đề tài, liên kết tệp, trích dẫn nguyên văn và `authorsText` theo nguồn. `Contributor` có vai trò tác giả/chủ biên/chủ nhiệm/thành viên; `staffId` tùy chọn tham chiếu hồ sơ cán bộ. Domain kiểm tra dữ liệu và điều kiện công khai, application service kiểm tra cán bộ/ảnh qua các port; adapter PostgreSQL lưu JSONB và bảng quan hệ tác giả. Bản nháp không thay đổi trang public cho đến khi đăng lại.

`AcademicProgram` trong domain `academics` đã là đối tượng độc lập: mỗi chương trình đào tạo là một instance có khung học phần, đầu ra và trang riêng. Bốn chương trình tham khảo đang công khai.

## CMS và public

- CMS: `/admin/research` chọn loại, tạo/sửa metadata, chọn tác giả từ hồ sơ cán bộ, nhập tên tác giả nguyên văn nếu tác giả ở ngoài đơn vị, lưu nháp, đăng hoặc gỡ.
- Public: `/vi/nghien-cuu`, `/vi/nghien-cuu/de-tai`, `/vi/nghien-cuu/cong-bo`, `/vi/nghien-cuu/giao-trinh`, `/vi/nghien-cuu/tai-lieu`; mỗi bản ghi ở `/vi/nghien-cuu/cong-trinh/{slug}`.
- Trang `/vi/can-bo/{slug}` tự liệt kê công trình liên quan; `/vi/nghien-cuu/tac-gia/{id}` hiển thị toàn bộ công trình của cán bộ.
- Menu public có 7 nhóm: Bộ môn, Đào tạo, Tuyển sinh, Nghiên cứu, Chất lượng, Sinh viên, Tin & cơ hội. Nhóm Nghiên cứu dẫn đến các loại đối tượng và hội thảo; Đào tạo giữ 4 chương trình riêng. Admin vẫn có thể chỉnh menu và đăng lại trong Website → Menu điều hướng.

## Chuyển dữ liệu nguồn

Chạy `node scripts/reference/migrate-research.mjs` để tạo `.runtime/research-migration/audit.json` và xem bản ghi trước khi nhập. Chạy với `--apply` để tạo/công khai; script lưu checkpoint `.runtime/research-migration/state.json` và có thể tiếp tục khi bị ngắt. `--apply --refresh` cập nhật lại bản ghi đã nhập từ nguồn. Cần `LRD_ADMIN_EMAIL`, `LRD_ADMIN_PASSWORD` và site đang chạy (mặc định `http://localhost:8088`). Sau đó chạy `node scripts/reference/rebuild-menu.mjs` để xuất bản menu mới.

Hiện có 501 bản ghi nhập từ 8 trang nguồn: 85 đề tài, 335 bài báo, 68 bài hội thảo, 11 giáo trình và 2 tài liệu có liên kết tệp. 396 bản ghi có ít nhất một tác giả khớp chắc chắn với 17 cán bộ công khai. `authorsText` và `citation` giữ văn bản nguồn cho mọi bản ghi; tên không khớp không bị gán cho cán bộ. Trang bài gốc vẫn được giữ làm nguồn đối chiếu. Các mục không có tệp gốc chỉ hiển thị metadata và liên kết nguồn, không tạo tệp giả.
