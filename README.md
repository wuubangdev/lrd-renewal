# LRD · Website và CMS Bộ môn Tài nguyên Đất đai

Monorepo gồm **một Next.js TypeScript App Router**, **một Spring Boot**, **PostgreSQL** và object storage tương thích S3. Public website và CMS dùng cùng frontend; mọi nghiệp vụ và quyền dữ liệu nằm ở backend.

## Chạy nhanh

Yêu cầu: Node.js 24, Java 21, Docker Compose. Maven Wrapper có sẵn.

```bash
npm ci
npm run setup
npm run infra:up
```

Mở hai terminal tại thư mục gốc:

```bash
# Terminal 1: Spring Boot
npm run dev:api

# Terminal 2: Next.js
npm run dev
```

- Website: [localhost:3000/vi](http://localhost:3000/vi)
- CMS: [localhost:3000/admin/content](http://localhost:3000/admin/content)

Trong editor bài viết, chọn **Nhập Word .docx** để đưa tiêu đề, tóm tắt, đoạn văn, đề mục, danh sách, bảng và ảnh PNG/JPEG từ tệp Word vào bản nháp. Giới hạn tệp 15 MB, tối đa 30 ảnh (mỗi ảnh tối đa 8 MB). Kiểm tra nội dung và đường dẫn trước khi đăng; nhập Word không tự cập nhật bài công khai. Định dạng Word ngoài các thành phần CMS hỗ trợ có thể bị giản lược.

Danh sách **Bài viết** có tìm kiếm tiêu đề/tóm tắt và bộ lọc chuyên mục, trạng thái. Editor tự lưu bản nháp, hỗ trợ `Ctrl+S`/`⌘S`, hiển thị danh sách điều kiện trước khi đăng và đường dẫn xem trước. Quản trị viên mở **Nội dung → Chuyên mục** để tạo, đổi tên tiếng Việt/Anh, chỉnh thứ tự hoặc xóa chuyên mục chưa được dùng. Mã chuyên mục không đổi sau khi tạo; sáu mã có sẵn vẫn tương thích với URL và dữ liệu cũ. **Website → Menu điều hướng** cho phép chọn mục chính ở cột trái, sửa liên kết/mục con ở cột phải, đổi thứ tự bằng nút mũi tên và xem cấu trúc đang soạn. Cần bấm **Đăng công khai** để áp dụng menu lên website.

Trong **Thông tin bài viết**, trường **Tác giả hiển thị** độc lập với tài khoản đăng bài và thông tin nguồn. Bài cũ được điền tác giả từ nguồn hoặc người đăng qua migration V14; sửa tác giả trong bản nháp chỉ đổi trang public sau khi đăng lại. Trang chi tiết có nút chia sẻ Facebook, LinkedIn, email và sao chép liên kết chuẩn. Metadata canonical, Open Graph, Twitter và JSON-LD dùng tiêu đề, mô tả, tác giả, ngày và ảnh đại diện của bài; bài không có ảnh dùng ảnh chia sẻ dự phòng. Đặt `SITE_URL` là HTTPS domain công khai khi triển khai thật để bot mạng xã hội tải được ảnh và trang.

**Nội dung → Cán bộ** quản lý mỗi cán bộ như một hồ sơ có cấu trúc: tên, học hàm/học vị, chức vụ, đơn vị, chuyên môn, liên hệ công việc, ảnh chân dung và các đề mục chứa thuộc tính, đoạn văn, danh sách, bảng, ảnh. Trường trống không hiện ở trang public. Chọn một trong năm mẫu trình bày; sửa bản nháp, xem trước rồi đăng trực tiếp. Ghi chú nội bộ không được trả về API công khai. Trang danh sách ở `/vi/can-bo` và mỗi hồ sơ có URL riêng.

Trên dữ liệu site tham khảo đã seed, `scripts/reference/migrate-staff.mjs --apply` chuyển 17 bài lý lịch thành hồ sơ, giữ liên kết bài cũ bằng redirect. Chạy lại với `--apply --refresh` sau khi cập nhật bộ chuyển đổi; script dùng `LRD_ADMIN_EMAIL` và `LRD_ADMIN_PASSWORD` trong môi trường. Kiểm tra hồ sơ trước khi gỡ bài gốc. Thông tin cá nhân như ngày sinh, quê quán, địa chỉ và số điện thoại cá nhân được đưa vào các thuộc tính riêng tư trong CMS để người quản trị rà soát trước khi quyết định công khai. Chương trình đào tạo và đợt tuyển sinh đã là đối tượng có cấu trúc; tin tức, thông báo và nội dung tự do tiếp tục dùng bài viết.

Khối **Ban chủ nhiệm bộ môn** ở trang cán bộ lấy các hồ sơ công khai có chức vụ `Trưởng bộ môn` hoặc `Phó trưởng bộ môn`; quản trị viên sửa và đăng hồ sơ trong CMS để cập nhật khối này. Dữ liệu đối chiếu từ trang nhân sự gốc ghi nhiệm kỳ **2021–2025**, nên giao diện hiển thị rõ mốc này. `scripts/reference/repair-staff-leadership.mjs --apply` cập nhật và đăng lại vai trò, email, phần việc của ba thành viên cùng chức vụ cũ của GS. TS. Võ Quang Minh mà không đụng đến các đề mục khoa học đã nhập. Lệnh có thể chạy lại an toàn và dùng cùng biến môi trường quản trị như script chuyển hồ sơ.

**Nội dung → Phòng thí nghiệm** quản lý từng phòng với tên, người phụ trách, liên hệ, ảnh, chức năng, nhiệm vụ, thiết bị, học phần và hình ảnh trong các đề mục. `scripts/reference/migrate-laboratories.mjs --apply` chuyển hai phòng trên site tham khảo vào CMS. Sau khi kiểm tra đủ hồ sơ public, thêm `--withdraw-legacy` để gỡ bài cũ khỏi danh sách tin; URL cũ chuyển tiếp sang trang phòng thí nghiệm. Với hồ sơ cán bộ, dùng cùng cờ `--withdraw-legacy` trên script tương ứng. Bài nguồn vẫn còn trong CMS và lịch sử để đối chiếu.

Sau khi chuyển hồ sơ, chạy `scripts/reference/relink-directory-menu.mjs` để đổi ba liên kết menu cũ sang danh sách cán bộ và hai phòng thí nghiệm; script đăng lại menu công khai. CMS menu cũng cho chọn trực tiếp một phòng thí nghiệm đã công khai.

**Nội dung → Nghiên cứu & học liệu** quản lý đề tài, bài báo khoa học, bài đăng hội thảo, giáo trình/sách và tài liệu như các đối tượng riêng. Mỗi đối tượng có metadata, trích dẫn gốc, liên kết nguồn/tệp, bản nháp và bản công khai; tác giả thuộc bộ môn được nối tới hồ sơ cán bộ. Trang cán bộ tự hiển thị các công trình đã nối. Bốn chương trình đào tạo là bốn đối tượng `AcademicProgram` riêng trong **Đào tạo**. Dữ liệu từ website tham khảo được chuyển bằng `scripts/reference/migrate-research.mjs --apply` (chạy trước không có `--apply` để xem audit) và menu được sắp lại bằng `scripts/reference/rebuild-menu.mjs`. Xem [hướng dẫn Nghiên cứu](docs/research.md).

### Tạo bố cục bài viết bằng Gemini

Quản trị viên mở **Hệ thống → Tích hợp**, chọn **Cấu hình & kiểm tra**, nhập khóa API và model, bấm **Kiểm tra kết nối** trong modal rồi lưu. Khóa được mã hóa trong PostgreSQL và không được trả lại trình duyệt. Mặc định dùng `gemini-2.5-flash`; có thể đổi model tại modal. Nếu cần khóa mã hóa riêng, đặt `LRD_SETTINGS_ENCRYPTION_KEY` trong `.env` trước khi lưu cấu hình; khi không đặt, backend dẫn xuất khóa từ `LRD_AUTH_PRIVATE_KEY`. Giữ khóa mã hóa ổn định để đọc được cấu hình đã lưu.

Trong editor chọn **Tạo bài với Gemini** và tải `.docx` lên. Backend trích nội dung Word, gửi văn bản và loại khối tới Gemini để đề xuất tiêu đề, tóm tắt và đề mục H2. Các đoạn gốc, bảng, ảnh và thứ tự vẫn được giữ; trang public tự tạo mục lục khi có ít nhất hai đề mục. Xem trước và sửa bản nháp trước khi đăng. Nếu chưa cấu hình khóa, nút Gemini sẽ tắt và chức năng nhập Word thường vẫn hoạt động. Nội dung văn bản của file được gửi tới Google khi dùng tính năng này; ảnh nhúng không được gửi dưới dạng dữ liệu ảnh.

### Phiên bản tiếng Anh và dịch bằng AI

Website công khai có `/vi` và `/en`, nút chuyển ngôn ngữ ở header. Trang chủ/menu tiếng Anh mặc định được seed và công khai; các bài viết, hồ sơ và đối tượng khác chỉ xuất hiện ở `/en` sau khi đăng bản tiếng Anh riêng. Khi chưa có bản dịch công khai, URL chi tiết tiếng Anh có thể trả 404.

Trong editor của **bài viết, cán bộ, phòng thí nghiệm, chương trình đào tạo, tuyển sinh, hội thảo/tin tức/tuyển dụng, nghiên cứu/học liệu, trang chủ và menu**, lưu bản nháp tiếng Việt rồi chọn **Tạo bản Anh bằng AI**. Gemini dịch các trường nội dung, giữ cấu trúc rich text, ảnh, ngày, mã, đường dẫn và các ID; bản tiếng Anh được tạo dưới dạng **nháp**, không tự đăng. Mở bản Anh để rà tên riêng, thuật ngữ, số liệu và liên kết, sau đó đăng công khai. Nút **Dịch lại** thay bản nháp tiếng Anh theo bản tiếng Việt đã lưu, nhưng không đổi nội dung đang công khai cho tới khi bấm cập nhật công khai. Bản tiếng Việt và tiếng Anh có trạng thái, lịch sử và URL riêng.

Liên kết nội bộ trong trang chủ/menu được đổi sang ID tiếng Anh nếu đối tượng đích đã có bản dịch; kiểm tra các liên kết chưa có bản dịch trước khi đăng. Bài nổi bật không có bản dịch tiếng Anh sẽ không được ghim lên trang chủ tiếng Anh. Hội thảo/tin tức/tuyển dụng có bài viết liên kết sẽ tạo bản nháp tiếng Anh của bài đó trước; đăng bài viết tiếng Anh trước khi đăng hồ sơ liên kết. Quá trình dịch gửi **nội dung văn bản** tới Gemini qua khóa đã lưu ở **Hệ thống → Tích hợp**; không gửi ảnh nhị phân hay ghi chú riêng tư của cán bộ. Nếu chưa cấu hình khóa, API báo lỗi rõ ràng và không tạo bản dịch.
- Kiểm tra backend: [localhost:8080/actuator/health](http://localhost:8080/actuator/health)
- MinIO console local: [localhost:59001](http://localhost:59001)

**Đăng nhập:** email và mật khẩu ngẫu nhiên được ghi trong `.env`, ở `LRD_ADMIN_EMAIL` / `LRD_ADMIN_PASSWORD`. Setup không in mật khẩu ra terminal. Backend chỉ tạo tài khoản bootstrap khi bảng tài khoản còn rỗng; sửa biến môi trường không tự đổi mật khẩu tài khoản đã có. Không commit `.env`.

### Chạy toàn bộ bằng Docker

Chỉ cần Node.js để tạo cấu hình ban đầu và Docker để chạy ứng dụng:

```bash
node scripts/init-local.mjs
docker compose --env-file .env -f infra/compose/compose.yml --profile app up -d --build
```

Mở [localhost:8088/vi](http://localhost:8088/vi) và [localhost:8088/admin/content](http://localhost:8088/admin/content).

Compose lưu PostgreSQL và ảnh trong named volumes. `down` giữ dữ liệu; không dùng `down -v` nếu muốn giữ nội dung. Cổng database và object storage chỉ bind vào loopback. Backend/frontend container đi qua Nginx cùng origin.

Nếu phát triển từ WSL, cài Node/Java/Docker trong cùng môi trường hoặc chạy các lệnh trên bằng PowerShell với bộ công cụ Windows. Không trộn npm Windows với shell script Linux.

## Luồng đã triển khai

1. Đăng nhập tài khoản nội bộ.
2. Tạo bài và chỉnh tiêu đề, tóm tắt, chuyên mục, slug.
3. Soạn rich text: đề mục, danh sách, trích dẫn, liên kết và ảnh.
4. Upload JPG/PNG; chọn ảnh đại diện hoặc chèn ảnh trong nội dung, có mô tả ảnh.
5. Lưu tự động / lưu nháp và xem trước trong route được bảo vệ.
6. **Đăng công khai**: bài và ảnh xuất hiện ngay, không có bước duyệt.
7. Sửa bài đã đăng tạo thay đổi ở bản nháp; **Cập nhật công khai** mới thay bản người đọc thấy.
8. Xem lịch sử, khôi phục vào nháp hoặc gỡ bài.
9. Đăng xuất thu hồi phiên trên backend.
10. Quản lý tài khoản: mời người dùng, gán Admin/Editor/Author, khóa/mở, cấp liên kết reset một lần và thu hồi mọi phiên.
11. Tự đổi mật khẩu bằng mật khẩu hiện tại; reset theo liên kết do admin cấp, hết hạn sau 30 phút.
12. CMS trang chủ và menu: lưu nháp, xem trước, đăng trực tiếp, lịch sử/khôi phục; hero/ảnh, thứ tự khối, tin ghim, thông tin liên hệ và menu hai cấp.

13. CMS chương trình đào tạo: bậc học, văn bằng, chuẩn đầu ra, nghề nghiệp, phiên bản khung/học phần, kiểm định, liên hệ và ảnh; nháp/công khai/lịch sử/khôi phục/ngừng.
14. CMS tuyển sinh: chương trình và chỉ tiêu, điều kiện, cổng nộp hồ sơ, mốc đăng ký/lịch trình; gia hạn, đóng sớm và gỡ thông báo có lý do.
15. Public đào tạo/tuyển sinh: tìm kiếm và bộ lọc, trang chi tiết, hiệu lực chứng nhận, trạng thái tuyển sinh theo giờ Việt Nam, canonical/sitemap/redirect; menu và trang chủ liên kết nội dung theo ID.

Mở [CMS đào tạo](http://localhost:8088/admin/programs), [CMS tuyển sinh](http://localhost:8088/admin/admissions), [đào tạo public](http://localhost:8088/vi/dao-tao) và [tuyển sinh public](http://localhost:8088/vi/tuyen-sinh) khi chạy Docker. Nội dung đào tạo chính thức cần nhập trong CMS; danh sách không seed bằng dữ liệu giả. Xem [hướng dẫn Academics](docs/academics.md).

## Cấu trúc

```text
apps/
  web/
    src/app/
      [locale]/                  Website công khai
      admin/login/               Đăng nhập
      admin/session-check/       Làm mới chứng thực điều hướng
      admin/(workspace)/         Layout CMS; không làm thay đổi URL
    src/features/                identity, publishing, media, site, academics, directory, research
    src/components/              Shell và thành phần dùng chung
    src/lib/                     Hợp đồng API, HTTP client, server DAL
    src/proxy.ts                 Chặn điều hướng admin
    e2e/                         Kiểm thử trình duyệt
  api/
    src/main/java/vn/edu/ctu/lrd/
      identity/                  Tài khoản, vai trò, phiên
      publishing/                Bài, nháp, phiên bản công khai
      academics/                 Chương trình, khung đào tạo, kiểm định, tuyển sinh
      directory/                 Hồ sơ cán bộ và phòng thí nghiệm có cấu trúc
      media/                     Ảnh, xử lý tệp, quyền đọc
      localization/              Dịch AI, liên kết bản Việt–Anh, giữ cấu trúc đối tượng
      site/                      Trang chủ, menu, revision, route và alias
      discovery/                 Chỉ mục và tìm kiếm
      platform/                  Giao dịch, audit, xử lý lỗi
      sharedkernel/              Actor, lỗi nghiệp vụ
    src/main/resources/db/migration/
    src/test/java/               Domain, kiến trúc, tích hợp
infra/compose/                   PostgreSQL, MinIO, ứng dụng, ingress
docs/                            Kiến trúc và kế hoạch đầy đủ
```

Mỗi module có `domain`, `application` và `adapters` khi cần. Domain/application không import Spring, JPA hoặc SDK lưu trữ. Module khác chỉ gọi `api` được công bố. Kiểm tra này được thực thi bằng ArchUnit.

## Quyền và phiên

| Vai trò | Bài viết                    | Ảnh                         | Đào tạo / tuyển sinh | Tài khoản / Website               |
| ------- | --------------------------- | --------------------------- | -------------------- | --------------------------------- |
| AUTHOR  | Tạo, sửa, đăng bài của mình | Upload và dùng ảnh của mình | Không quản trị       | Tự đổi mật khẩu                   |
| EDITOR  | Sửa, đăng mọi bài           | Quản lý ảnh dùng chung      | Quản trị toàn bộ     | Tự đổi mật khẩu                   |
| ADMIN   | Sửa, đăng mọi bài           | Quản lý ảnh dùng chung      | Quản trị toàn bộ     | Tài khoản, quyền, trang chủ, menu |

Phiên opaque được lưu bằng Spring Session JDBC, cookie HttpOnly/SameSite=Lax; idle 30 phút và tối đa 8 giờ. Spring kiểm tra tài khoản/quyền mỗi request. CSRF và allowlist Origin bảo vệ mutation.

Đổi quyền, khóa tài khoản, đổi/reset mật khẩu hoặc thu hồi phiên làm vô hiệu mọi phiên cũ. Không thể khóa/hạ quyền admin đã kích hoạt cuối cùng, kể cả khi có hai yêu cầu đồng thời. Bootstrap chỉ tạo admin khi bảng tài khoản còn rỗng.

Mở /admin/users để quản lý người dùng, /admin/security để đổi mật khẩu, /admin/site/home và /admin/site/menu để biên tập website. Liên kết reset được admin sao chép và gửi riêng, chưa tích hợp gửi email tự động.

`proxy.ts` kiểm tra route hint ký RS256, hạn 5 phút. Hint chỉ hỗ trợ điều hướng, không thay thế phiên backend. Khi hint hết hạn, Next gọi endpoint backend để làm mới; server DAL vẫn xác thực lại trước khi tải dữ liệu CMS.

Khi triển khai HTTPS, đặt `LRD_COOKIE_SECURE=true`, `SESSION_COOKIE=__Host-lrd-session`, `SITE_URL` đúng domain và `LRD_ALLOWED_ORIGINS` chỉ gồm origin được dùng. Khóa riêng chỉ ở backend; frontend chỉ cần `AUTH_PUBLIC_KEY`. Không đưa secret vào `NEXT_PUBLIC_*`.

## Dữ liệu và xuất bản

- Flyway quản lý schema; Hibernate chỉ validate, không tự sửa schema.
- Aggregate `ContentEntry`, `AcademicProgram`, `AdmissionCampaign` kiểm tra version/trạng thái và tạo snapshot công khai bất biến.
- Academics kiểm tra khung/chứng nhận, thời hạn và quan hệ chương trình–đợt tuyển; khóa giao dịch ngăn publish tuyển sinh đồng thời với retire chương trình.
- Ảnh được kiểm tra nội dung thật, giới hạn 8 MB / 20 megapixel, resize tối đa 2400px và mã hóa lại.
- Bucket private. API public chỉ đọc ảnh đang được một bản công khai sử dụng.
- `If-Match` ngăn ghi đè khi hai tab cùng sửa; UI giữ nội dung chưa lưu khi xung đột.
- Đăng/gỡ bài cập nhật revision, route, quyền đọc ảnh, search và audit trong cùng transaction.
- `Idempotency-Key` ngăn tạo thêm revision khi gửi lại giao dịch đăng bài.
- Nội dung JSON được render bằng component có allowlist; không nhận HTML tùy ý.
- Public dùng SSR và `no-store` trong giai đoạn này để bài vừa đăng/gỡ có hiệu lực ngay.

## Kiểm thử

```bash
npm run typecheck
npm run build
npm run test:api
npm run test:import
npx playwright install chromium
# Chạy API + web trước:
npm run test:e2e
```

Backend integration tests tự tạo PostgreSQL riêng bằng Testcontainers, không dùng database phát triển. Storage được thay bằng adapter bộ nhớ trong test backend; E2E kiểm tra upload thật qua MinIO. E2E tạo tài khoản, bài, ảnh, chương trình và đợt tuyển kiểm thử trong môi trường đang chạy, nên chỉ chạy trên local/test. ID được ghi ở `.runtime/e2e-fixtures.json`. Với Docker, đặt `E2E_BASE_URL=http://localhost:8088` trước khi chạy; hướng dẫn Bash/PowerShell nằm trong tài liệu Academics.

Có workflow `.github/workflows/verify.yml` cho typecheck, production build, backend tests và browser tests.

## Tài liệu

- [Nhập nhanh cán bộ, nghiên cứu và chương trình đào tạo bằng Excel](docs/excel-import.md)

- [QA frontend/backend/CMS và kết quả sửa](docs/qa-audit-2026-10-16.md)
- [Trạng thái triển khai](docs/implementation-status.md)
- [Hướng dẫn tài khoản và CMS trang chủ/menu](docs/identity-site.md)
- [Hướng dẫn đào tạo/tuyển sinh, API và kiến trúc](docs/academics.md)
- [Kế hoạch toàn bộ website](docs/README.md)
- [Kiến trúc](docs/architecture.md)
- [Domain model](docs/domain-model.md)
- [Dữ liệu và API](docs/data-and-api.md)
- [Design system](docs/design-system.md)

Phạm vi hiện tại có xuất bản, tài khoản/phân quyền/mật khẩu, CMS trang chủ/menu, Academics với CMS/public đào tạo–tuyển sinh, hồ sơ cán bộ, nghiên cứu/học liệu có cấu trúc, nhập nhanh Excel và bộ dữ liệu từ website gốc.

## Dữ liệu website tham khảo

Đã nhập từ [lrd.ctu.edu.vn](https://lrd.ctu.edu.vn/): **4 chương trình, 4 thông báo tuyển sinh, 97 bài toàn văn, 115 ảnh khác nhau**, Home/Menu và 134 redirect 301. Giữ nội dung, bảng, chùm ảnh, liên kết và ngày đăng gốc. Tài liệu đính kèm giữ liên kết chính thức.

```bash
npm run seed:check
npm run seed:reference
```

Seed qua API của bản Docker tại `http://localhost:8088`, dùng tài khoản Admin trong `.env`; chạy lại không tạo trùng hoặc ghi đè nội dung đã sửa trong CMS. Dữ liệu, giới hạn và cách tiếp tục khi gián đoạn: [Hướng dẫn nhập nguồn](docs/reference-import.md).

Kiểm tra cả gói nguồn: `E2E_BASE_URL=http://localhost:8088 E2E_REFERENCE_DATA=1 npm run test:e2e` (PowerShell xem tài liệu). Bộ kiểm thử hiện có **71 test backend**, **6 test importer** và **39 E2E** (gồm đối chiếu toàn bộ dữ liệu nguồn và chuyển động trên desktop/mobile).

Trang public có slider tin tức điều khiển bằng nút, bàn phím hoặc vuốt; hero và nội dung xuất hiện theo nhịp cuộn, hover rõ, header bám đầu trang và nút về đầu trang. Không tự chuyển tin; khi thiết bị bật giảm chuyển động, hiệu ứng và cuộn mượt được tắt. Xem [Design system](docs/design-system.md).

Nâng cấp seed tóm lược đã có sang toàn văn, giữ cấu hình Site: `node --env-file=.env scripts/reference/seed.mjs --apply --update-if-unchanged --skip-site`. Xem báo cáo nhập nguồn trước khi cập nhật.

### Hồ sơ hội thảo, tin tức, tuyển dụng

CMS `/admin/editorial?kind=EVENT|NEWS|JOB` quản lý từng đối tượng có thuộc tính riêng và liên kết duy nhất tới một bài viết đã công khai. Bài viết giữ nội dung dài, lịch sử phiên bản và trình soạn thảo. Trang public: `/vi/hoi-thao`, `/vi/tuyen-dung`, `/vi/tin-tuc`; mỗi hồ sơ mở trang chi tiết theo mẫu thống nhất và hiển thị nội dung bài viết liên kết. Chuyển dữ liệu tham khảo đã seed bằng `node scripts/reference/migrate-editorial.mjs --apply` (chạy qua môi trường `.runtime/run.cjs`).

### Banner trang chủ

**Website → Trang chủ → Banner trang chủ** giữ banner chính và cho thêm tối đa năm slide. Mỗi slide có ảnh, thông điệp và nút dẫn riêng; có thể đổi thứ tự, xem trước và đăng công khai qua CMS. Slider public tự chuyển sau 6,5 giây, dừng khi người dùng trỏ chuột hoặc thao tác bàn phím, có nút trước/sau và chỉ báo slide. Chế độ giảm chuyển động không tự chạy. Trên dữ liệu tham khảo đã nhập, `scripts/reference/seed-home-slides.mjs --apply` thêm hai slide từ bài trao đổi sinh viên và hội thảo khoa học đã công khai; chạy lại sẽ giữ nguyên nội dung nếu CMS đã có slide bổ sung.
