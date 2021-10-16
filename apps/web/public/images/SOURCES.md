# Nguồn hình ảnh

Các tệp này dùng cho bản dựng lại website theo yêu cầu của chủ dự án:

- campus.jpg: https://lrd.ctu.edu.vn/images/2021/10/14/khoamt1.jpg — ảnh khuôn viên khoa trên website bộ môn.
- ctu-logo.png: https://www.ctu.edu.vn/images/upload/logomobile.png — nhận diện Đại học Cần Thơ, hiển thị phần biểu trưng bằng CSS.
- defaults/*.webp: bộ thumbnail minh họa được tạo bằng công cụ tích hợp `image_gen` cho từng nhóm nội dung giáo dục, ngày 16/10/2026. Đây là ảnh minh họa chung; ảnh cán bộ là minh họa ẩn danh. Chỉ dùng khi đối tượng chưa có ảnh CMS, không thay thế ảnh thật đã được chọn. Ánh xạ tại `src/lib/default-thumbnails.ts`; prompt và thông số từng ảnh lưu tại `docs/assets/default-thumbnails.json`.
- defaults/*.svg: bộ minh họa vector cũ do dự án tự tạo, giữ để các URL ảnh cũ tiếp tục hoạt động. Ánh xạ thumbnail hiện tại dùng WebP.

Ngày lấy: 15/10/2026. Quyền đối với hình ảnh/nhận diện thuộc nguồn gốc; đây không phải giấy phép phân phối lại tài nguyên độc lập.
