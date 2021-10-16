# Kế hoạch xây dựng lại website Bộ môn Tài nguyên Đất đai

Ngày lập: 15/10/2026. Trạng thái: đã triển khai monorepo và luồng xuất bản đầu tiên; xem [trạng thái thực tế](implementation-status.md) và [hướng dẫn chạy](../README.md).

Xây dựng lại website https://lrd.ctu.edu.vn/ với giao diện giáo dục hiện đại và CMS quản trị nội dung. Kiến trúc gồm một frontend Next.js TypeScript App Router, một backend Spring Boot và một cơ sở dữ liệu PostgreSQL. Backend tổ chức thành modular monolith, mỗi module nghiệp vụ áp dụng kiến trúc lục giác.

## Yêu cầu đã xác nhận

- Một ứng dụng Next.js phục vụ cả website công khai và `/admin`, tách layout và bundle bằng App Router.
- Một ứng dụng Spring Boot sở hữu toàn bộ nghiệp vụ, xác thực, quyền truy cập và dữ liệu.
- PostgreSQL là cơ sở dữ liệu chính.
- Domain có hành vi và bất biến nghiệp vụ; controller và application service không chứa toàn bộ luật nghiệp vụ.
- UI được thiết kế lại theo design system thống nhất cho website giáo dục và CMS.
- Không có bước duyệt bài. Người có quyền đăng bấm **Đăng công khai** là bài xuất hiện sau khi giao dịch lưu thành công.
- Proxy bảo vệ luồng truy cập admin; backend kiểm tra quyền thực sự tại API và use case.

## Giả định làm việc

Các mục dưới đây là phương án mặc định, có thể thay đổi trước giai đoạn liên quan mà không cần đổi kiến trúc tổng thể.

| Hạng mục         | Mặc định                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| Đăng nhập        | Tài khoản do Administrator cấp; reset bằng liên kết dùng một lần do quản trị viên tạo; chuẩn bị SSO sau |
| Ngôn ngữ         | Có cấu trúc Việt và Anh; tiếng Việt đầy đủ khi ra mắt, bản Anh chỉ hiện khi đã có nội dung              |
| Vai trò          | Author, Editor, Administrator; quyền có phạm vi own/all                                                 |
| Hạ tầng          | Một máy chủ Linux hoặc nền tảng container tương đương; TLS và cùng origin                               |
| Tệp              | Object storage tương thích S3; không lưu tệp trong filesystem tạm của container                         |
| Chuyển nội dung  | Nhập bài, ảnh, tệp công khai từ trang cũ; lưu bản gốc, đối chiếu và ánh xạ URL                          |
| Hồ sơ tuyển sinh | Dẫn đến hệ thống tuyển sinh của trường; website này không xử lý hồ sơ nhập học                          |
| Phản hồi         | Hiển thị đầu mối và kênh liên hệ; chưa xây hệ thống xử lý ticket                                        |

## Bộ tài liệu triển khai

| Tài liệu                                      | Nội dung                                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [Kiến trúc](architecture.md)                  | Sơ đồ hệ thống, package, dependency rule, routing, session, phân quyền, transaction và cache |
| [Mô hình domain](domain-model.md)             | Ranh giới module, aggregate, value object, hành vi, bất biến và vòng đời xuất bản            |
| [Dữ liệu và API](data-and-api.md)             | Schema PostgreSQL, revision, concurrency, hợp đồng REST, media, tìm kiếm và migration        |
| [Design system](design-system.md)             | Định hướng hình ảnh, token, component, bố cục public/admin và hợp đồng CMS block             |
| [Lộ trình triển khai](implementation-plan.md) | Phạm vi, dependency, công việc, ước lượng, nghiệm thu, vận hành và phát hành                 |

## Phạm vi bản đầu

| Khu vực            | Website công khai                                                                     | CMS tương ứng                                                                    |
| ------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Trang chủ          | Giới thiệu ngắn, ngành đào tạo, tuyển sinh hiện hành, tin mới, nghiên cứu nổi bật     | Sửa nội dung hero, chọn nội dung nổi bật, thứ tự section trong giới hạn template |
| Bộ môn             | Giới thiệu, lịch sử, nhân sự, hồ sơ giảng viên, liên hệ                               | Trang giới thiệu, đơn vị, nhân sự, thông tin liên hệ                             |
| Đào tạo            | Quản lý đất đai, Quy hoạch vùng và đô thị, thạc sĩ, tiến sĩ; chương trình và tài liệu | Ngành học, phiên bản chương trình, chuẩn đầu ra, thời lượng, liên kết tài liệu   |
| Tuyển sinh         | Danh sách và chi tiết đợt tuyển; hiển thị còn hạn/hết hạn                             | Đợt tuyển, mốc thời gian, ngành liên quan, thông báo, đường dẫn nộp hồ sơ        |
| Phòng thí nghiệm   | GIS và Viễn thám, Tài nguyên đất đai, thiết bị                                        | Hồ sơ phòng, thiết bị, ảnh và người liên hệ                                      |
| Nghiên cứu         | Dự án, đề tài, công bố, chuyển giao, giáo trình, hội thảo                             | Dữ liệu nghiên cứu có cấu trúc và bài giới thiệu liên quan                       |
| Đảm bảo chất lượng | AUN-QA, chương trình kiểm định, tài liệu được phép công khai                          | Nội dung giới thiệu, chứng nhận, tài liệu, trạng thái quyền truy cập             |
| Sinh viên          | Thông báo, hoạt động, biểu mẫu, luận văn, học bổng, việc làm, cựu sinh viên           | Bài viết theo loại, taxonomy, thư viện tài liệu, liên kết hệ thống của trường    |
| Dùng chung         | Tìm kiếm, SEO, sitemap, đa ngôn ngữ, trang lỗi                                        | Media, revision, menu, SEO, redirect, tài khoản, quyền, audit                    |

Các chuyên mục tin tức dùng chung domain Publishing; không tạo module Java riêng cho mỗi chuyên mục. Thông tin có quy tắc riêng như hạn tuyển sinh, phiên bản chương trình và trạng thái dự án được quản lý bằng model có cấu trúc.

## Các quyết định nền tảng

1. Chia theo domain trước, chia domain/application/adapters bên trong mỗi module.
2. Mọi thay đổi dữ liệu đi qua Spring Boot. Next.js không kết nối PostgreSQL.
3. Public content được đọc từ bản đã xuất bản; bản nháp và autosave không thay đổi bản công khai.
4. Đăng, cập nhật công khai và gỡ bài cập nhật dữ liệu cùng chỉ mục tìm kiếm trong một transaction.
5. V1 dùng SSR động cho nội dung công khai, không dựa vào ISR để bảo đảm bài mới xuất hiện. Static asset và ảnh công khai được tối ưu riêng.
6. Rich text lưu dưới dạng JSON có schema và phiên bản. Bố cục trang dùng danh sách block được kiểm soát bởi design system.
7. Một monorepo, hai artifact triển khai. Database, ingress và object storage là hạ tầng, không phải các backend nghiệp vụ bổ sung.
8. Không có trạng thái chờ duyệt hoặc vai trò Reviewer trong phạm vi đã xác nhận.

## Những phần để sau bản đầu

- SSO của trường, MFA theo chính sách đơn vị, đồng biên tập thời gian thực.
- Hẹn giờ đăng bài, chiến dịch email và thông báo đa kênh.
- Đăng ký tham dự hội thảo, nộp hồ sơ tuyển sinh trực tuyến, LMS, điểm số và học phí.
- Tìm kiếm ngữ nghĩa, chatbot, cá nhân hóa, kiến trúc đa đơn vị/đa tenant.
- Page builder kéo thả tùy ý và cho phép người dùng nhập JavaScript/CSS.

## Căn cứ thiết kế

Trang cũ hiện có các nhóm nội dung đào tạo, nghiên cứu, nhân sự, phòng thí nghiệm, sinh viên, AUN-QA và hội thảo. Kế hoạch giữ các năng lực thông tin này, đồng thời tổ chức lại điều hướng và bổ sung dữ liệu thời hạn cho tuyển sinh. Nguồn: [website hiện tại](https://lrd.ctu.edu.vn/).

Tài liệu kỹ thuật chính thức được dẫn tại các quyết định tương ứng trong bộ tài liệu. Phiên bản thư viện phải được chốt và khóa ở giai đoạn khởi tạo; các số phiên bản trong kế hoạch là baseline, không phải cam kết luôn dùng bản mới nhất.

## Module đã triển khai

- [Academics: quản trị đào tạo, tuyển sinh, public và API](academics.md)

## Dữ liệu website cũ

[Hướng dẫn nhập nguồn](reference-import.md): bộ seed đã rà soát, ảnh, URL cũ, idempotency, đối chiếu thông tin tuyển sinh và kiểm thử.
