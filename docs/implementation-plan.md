# Lộ trình triển khai và nghiệm thu

## Cách triển khai

Làm theo lát cắt chức năng xuyên frontend–backend–database. Lát cắt đầu tiên hoàn chỉnh là đăng nhập → viết bài → upload ảnh → đăng trực tiếp → mở trang public → sửa nháp → cập nhật/gỡ bài. Sau khi kiến trúc này chạy đúng mới mở rộng sang đào tạo và các module khác.

Mỗi lát cắt có: use case, model và bất biến, contract API, persistence/migration, giao diện, permission, test hành vi và tiêu chí hoàn thành. Không xây toàn bộ database/controller trước rồi mới tích hợp frontend ở cuối.

Mốc P5 Academics đã có CMS/public và nghiệp vụ đào tạo–tuyển sinh. Phạm vi thực tế, giới hạn và kết quả kiểm tra ở [Academics](academics.md) và [Trạng thái triển khai](implementation-status.md); bảng dưới vẫn là lộ trình tổng thể.

## Các giai đoạn

| Giai đoạn                    | Công việc chính                                                                         | Phụ thuộc                                       | Đầu ra/nghiệm thu                                                               | Ước lượng người-ngày |
| ---------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------- | -------------------- |
| P0 Khảo sát và khóa nền tảng | Inventory trang cũ, chốt scope/role, route map, ADR, baseline thư viện, prototype 6 màn | Không                                           | Danh mục nội dung, quyết định kiến trúc, token và contract đầu tiên             | 4–6                  |
| P1 Khởi tạo hệ thống         | Monorepo, Next, Spring, PostgreSQL, Flyway, CI, health, error contract, ArchUnit        | P0                                              | Hai app chạy local/staging; migration và kiểm tra dependency chạy CI            | 5–7                  |
| P2 Identity và admin shell   | Session, login/logout, CSRF, route hint, Proxy, permission, user management tối thiểu   | P1                                              | Direct API call trái quyền bị chặn; thu hồi phiên có hiệu lực; shell dùng token | 7–10                 |
| P3 Publishing và media       | Draft, editor, upload, revision, publish/withdraw, taxonomy, audit, concurrency         | P2                                              | Luồng viết–đăng–xem public–sửa–gỡ hoạt động đầy đủ, không có duyệt              | 12–16                |
| P4 Public UI và Site         | Homepage, navigation, article/page/list, search, locale, SEO, redirect registry         | P3                                              | Public dùng dữ liệu thật; CMS điều khiển được nội dung trang chủ trong template | 9–12                 |
| P5 Academics                 | Program/edition, curriculum, accreditation, admissions/deadline, public templates       | P3/P4                                           | Ngành và đợt tuyển có dữ liệu cấu trúc; thời hạn và trạng thái đúng             | 9–13                 |
| P6 Directory và Research     | Nhân sự, labs/equipment, projects, publications, conferences                            | P4/P5 theo liên kết                             | CMS/public hoàn chỉnh các khu vực, không lặp dữ liệu chuẩn                      | 10–14                |
| P7 Chuyển nội dung           | Importer, tài liệu sinh viên/AUN, media mapping, redirect, đối chiếu, delta import      | Bắt đầu inventory P0; nhập theo module sẵn sàng | Manifest rõ từng item; URL cũ quan trọng có đích đúng; nội dung được kiểm tra   | 7–10                 |
| P8 Kiểm thử và phát hành     | Accessibility, SEO, load, bảo mật, backup/restore, UAT, runbook và cutover              | P0–P7                                           | Đạt checklist phát hành, có rollback và bàn giao CMS                            | 9–12                 |

Tổng baseline **72–100 người-ngày kỹ thuật**, chưa tính thời gian tạo lại toàn bộ nội dung/biên dịch Anh ngữ. Dành thêm khoảng 20% cho dữ liệu cũ và điều chỉnh sau UAT: khoảng **86–120 người-ngày**. Một kỹ sư fullstack làm toàn thời gian thường tương đương khoảng **18–24 tuần**; hai kỹ sư FE/BE có designer/QA hỗ trợ có thể lập lịch khoảng **11–15 tuần**, tùy mức song song và thời gian nhận nội dung. Đây là ước lượng lập kế hoạch, cần cập nhật sau inventory P0.

P0 có wireframe/prototype để khóa design direction; P4 là triển khai toàn bộ public surface. Có thể làm design trước khi backend tương ứng hoàn tất bằng contract fixture; fixture phải được thay bằng API thật trước nghiệm thu phase.

## P0 — Các quyết định cần ghi thành ADR

- ADR-001: một FE, một BE modular monolith; package theo domain và dependency rule.
- ADR-002: session do Spring quản lý; route guard bằng Proxy; API/resource authorization tại backend.
- ADR-003: xuất bản trực tiếp, immutable revision và draft/live tách biệt.
- ADR-004: SSR động và read-after-commit cho public, quy tắc cache media.
- ADR-005: document JSON có version, typed block và design token.
- ADR-006: một PostgreSQL, schema ownership và transaction liên module.
- ADR-007: locale, canonical URL và migration redirect.

Ở P0 xác nhận logo/ảnh được dùng, người quản lý nội dung, chính sách vai trò, phạm vi bản Anh, hạ tầng có sẵn và khả năng export CMS cũ. Các lựa chọn này chưa ngăn việc thiết kế/khởi tạo kiến trúc đã chốt.

## Backlog cần hoàn thành theo capability

| ID      | Capability                               | Tiêu chí chấp nhận chính                                                                       |
| ------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| IAM-01  | Đăng nhập, đăng xuất, đổi/reset mật khẩu | Cookie đúng cấu hình, lỗi không lộ tài khoản, session fixation được xử lý                      |
| IAM-02  | Role, permission, ownership              | Author không sửa/đăng bài người khác bằng cách gọi API trực tiếp                               |
| IAM-03  | Thu hồi quyền/phiên                      | Khóa user hoặc đổi quyền có hiệu lực tại request API tiếp theo; không xóa admin cuối           |
| CMS-01  | Tạo/sửa nháp                             | Validation rõ, autosave không thay bản public                                                  |
| CMS-02  | Đăng trực tiếp                           | Không có review state; response thành công sau commit; GET mới thấy bài và search mới thấy bài |
| CMS-03  | Cập nhật/gỡ/khôi phục                    | Update đổi live snapshot; withdraw gỡ khỏi danh sách/search/sitemap; restore tạo draft         |
| CMS-04  | Revision/concurrency                     | Có lịch sử, version conflict không làm mất nội dung, retry không đăng trùng                    |
| CMS-05  | Category/tag/resource/page               | Một workflow chung, policy riêng theo loại; không có orphan reference                          |
| MED-01  | Upload/media picker                      | Asset READY mới được dùng để publish; file bị từ chối có lý do rõ                              |
| MED-02  | Usage/quyền tệp                          | Không xóa media đang dùng, private file không tải được khi thiếu quyền                         |
| SITE-01 | Header/menu/homepage                     | CMS sửa được nội dung trong block đã thiết kế, không cần code cho việc thay hero/tin nổi bật   |
| SITE-02 | Route/redirect                           | Slug duy nhất, đổi slug có redirect đúng, không có redirect loop                               |
| EDU-01  | Chương trình                             | Có bản nháp và live edition; bậc học/curriculum/accreditation đúng cấu trúc                    |
| EDU-02  | Tuyển sinh                               | Còn hạn/hết hạn đúng theo server time, gia hạn có audit, không mất thông báo sau hạn           |
| DIR-01  | Nhân sự/labs                             | Hồ sơ công khai tách account, thiết bị ngừng dùng có trạng thái đúng                           |
| RES-01  | Dự án/công bố/hội thảo                   | Ngày/trạng thái/DOI có validation, không tạo menu riêng cho từng năm                           |
| I18N-01 | Việt/Anh                                 | Mỗi locale có trạng thái public riêng; không giả lập bản Anh bằng bản Việt                     |
| SEO-01  | Metadata/sitemap                         | Chỉ public URL vào sitemap, canonical và hreflang hợp lệ, draft không index                    |
| MIG-01  | Import                                   | Chạy lại không nhân bản; lỗi có report; giữ ngày gốc và không ghi đè chỉnh sửa mới             |
| OPS-01  | Vận hành                                 | Backup khôi phục được trên môi trường thử; health/log/alert và rollback có tài liệu            |

## Chiến lược kiểm thử

### Domain và application

- ContentEntry không publish khi thiếu dữ liệu/tài nguyên; autosave giữ live snapshot cũ; restore không tự đăng.
- Hai version sửa cạnh tranh trả conflict; idempotency retry đúng kết quả.
- AdmissionCampaign đúng tại biên opensAt/closesAt và khi gia hạn/đóng sớm; dùng Clock cố định trong test.
- Program retire và campaign publish đồng thời không tạo chiến dịch public trỏ vào chương trình không còn public.
- Media retirement và content publish đồng thời không tạo asset usage mồ côi.
- Role change/disable không loại bỏ quản trị viên cuối trong hai request cạnh tranh.
- Transaction rollback không để bài public nhưng search/route/audit thiếu.

### Persistence, contract và quyền

Testcontainers với đúng major PostgreSQL production, không thay bằng H2. Kiểm tra Flyway từ DB rỗng và từ release trước, unique/FK/version, search có dấu/không dấu. Kiểm tra phân quyền cho cả URL và method/use case, ownership, CSRF, preview và private download.

OpenAPI kiểm tra schema public/admin không vô tình lộ field nội bộ. Client generated phải build cùng contract mới. ArchUnit chạy mỗi PR để chặn vi phạm kiến trúc.

### Frontend và E2E

Playwright kiểm tra các hành trình: đăng nhập → viết → upload → publish → public GET → sửa nháp → cập nhật → withdraw; Author cố mở/gọi API tài nguyên người khác; expired session trong lúc đang soạn; đổi locale; tìm kiếm; tải tài liệu; redirect URL cũ.

Visual regression tập trung vào sáu template đại diện và token. Accessibility kiểm tra tự động kết hợp bàn phím thật cho menu, dialog, editor, bảng và form lỗi. Không viết test chỉ để khẳng định một component render đúng text hardcode.

## Mục tiêu hiệu năng để kiểm chứng

| Mục tiêu                                  | Điều kiện đo                                                                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms        | Mục tiêu p75 cho người dùng thật; lab dùng để phát hiện vấn đề, không thay số liệu field                             |
| Public API p95 ≤ 500ms                    | Workload và cấu hình staging ghi rõ; không bao gồm upload/tải tệp lớn                                                |
| Bài public hiện ngay sau commit           | GET mới không dùng data/HTML cache cũ; search/sitemap cùng quy tắc                                                   |
| Không có admin/editor trong public bundle | Kiểm tra bundle và network của trang chủ/chi tiết bài                                                                |
| Pagination và search ổn định              | Dataset thử: 10.000 bài, 200 hồ sơ, 50 chương trình, 5.000 asset; đây là dữ liệu test, không phải số liệu của bộ môn |

P0/P1 khóa cấu hình máy và profile tải phù hợp ngân sách; baseline đề xuất 30 request public/giây với 5 editor hoạt động. Đo rồi tối ưu index, projection, ảnh và bundle trước khi thêm distributed cache. Chưa có benchmark thực tế vì ứng dụng chưa được xây dựng.

Các ngưỡng LCP/INP/CLS tham chiếu [Core Web Vitals](https://web.dev/articles/vitals); đây là mục tiêu nghiệm thu, không phải kết quả đã đo của sản phẩm.

## Hạ tầng, CI/CD và vận hành

Local dùng Compose cho PostgreSQL và object storage; frontend/backend chạy hot reload. Staging và production dùng hai container ứng dụng, ingress và storage/DB có volume hoặc dịch vụ được quản lý.

CI: lint/typecheck → domain/application tests → architecture rules → integration PostgreSQL → contract generation check → frontend build/backend package → E2E trọng yếu → build image có tag commit. Không cần mỗi PR chạy lại toàn bộ load test; chạy khi đổi query, media hoặc trước release.

Deploy: migration có kiểm soát bằng credential riêng → backend tương thích contract cũ → frontend → smoke test. Runtime DB account không có quyền DDL. Secret nằm ở secret store/environment, không trong source. Readiness/liveness phân biệt; log có request ID, metrics theo lỗi API, thời gian query, storage và đăng bài thất bại. Endpoint quản trị/Actuator chỉ mở phạm vi vận hành cần thiết.

Schema thay đổi theo expand–migrate–contract để rollback ứng dụng không đòi khôi phục DB ngay. Không dùng tự động DDL update ở production. Mỗi release phải biết phiên bản frontend/backend/database tương thích.

Backup PostgreSQL hàng ngày và WAL/PITR khi hạ tầng hỗ trợ; backup/versioning object storage và key/config cần khôi phục. Mục tiêu mặc định RPO 24 giờ, RTO 4 giờ; nếu yêu cầu RPO ngắn hơn phải bật PITR và điều chỉnh chi phí. Test restore cả DB lẫn media trước launch và định kỳ sau launch.

Single-host là baseline triển khai và có một điểm lỗi chung; nếu đơn vị yêu cầu HA, dùng managed DB/storage và nhiều replica của cùng artifact. Khi đó session JDBC dùng chung được, job cần DB lock và không dựa vào filesystem local. Không tự đưa Kubernetes vào phạm vi V1.

## Checklist phát hành

- [ ] Toàn bộ chức năng P0–P8 trong phạm vi V1 có dữ liệu thật và chủ sở hữu nội dung.
- [ ] Không có review workflow; người được cấp quyền publish đăng và gỡ được trực tiếp.
- [ ] Draft, preview, private media và admin data không lọt vào public API/cache/search/sitemap.
- [ ] Không có lỗi quyền nghiêm trọng; thử bypass Proxy bằng gọi API trực tiếp.
- [ ] URL cũ quan trọng được kiểm tra, không redirect hàng loạt về home, không có loop.
- [ ] Tài liệu cũ và hình ảnh khớp manifest; những mục không chuyển có quyết định xử lý.
- [ ] Tiếng Việt đầy đủ; English switch chỉ hiện ở nơi có bản dịch public.
- [ ] Responsive, keyboard, form error, ảnh/alt, metadata và 404 được kiểm tra.
- [ ] Công cụ nhập dữ liệu bị khóa theo profile/quyền sau migration; admin ban đầu không dùng mật khẩu mặc định.
- [ ] Backup/restore, rollback và các cảnh báo thiết yếu đã thử.
- [ ] Người vận hành được hướng dẫn viết, đăng, gỡ, khôi phục, upload, đổi menu và quản lý quyền.

## Cutover và rollback

Đối chiếu staging trước ngày chuyển; giữ bản sao CMS cũ. Chốt content freeze hoặc delta import, chạy backup, kiểm tra DNS/TLS, public paths và media. Chuyển ingress/DNS theo quyền của đơn vị, chạy smoke test, theo dõi lỗi/404/publish trong khoảng thời gian bàn giao.

Rollback ứng dụng dùng image phiên bản trước và migration tương thích. Nếu rollback về website cũ sau khi CMS mới đã nhận bài, phải export các thay đổi mới trước khi chuyển và ghi rõ điểm đồng bộ; không chấp nhận làm mất bài mới để rollback nhanh. Ngưỡng kích hoạt rollback gồm lỗi truy cập trên diện rộng, lộ dữ liệu riêng tư hoặc mất khả năng đăng/gỡ bài.

## Rủi ro và cách xử lý

| Rủi ro                                            | Hành động                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| Chưa biết số lượng/chất lượng dữ liệu cũ          | Inventory và thử import một mẫu ở P0; cập nhật ước lượng P7                     |
| Scope CMS mở rộng thành LMS/tuyển sinh trực tuyến | Giữ ranh giới capability đã ghi; lập scope riêng khi có nghiệp vụ mới           |
| Dùng Proxy làm lớp quyền duy nhất                 | Test API trực tiếp và enforcement ở backend là gate bắt buộc                    |
| Cache làm đăng/gỡ chậm                            | SSR no-store V1, kiểm thử GET sau commit và kiểm tra ingress                    |
| JSON/block thiếu kiểm soát                        | Schema version, allowlist node, limit, renderer typed và test dữ liệu cũ        |
| Domain bị biến thành entity CRUD                  | Review use case/invariant; ArchUnit và domain tests; controller không gọi repo  |
| Giao diện public/admin thiếu nhất quán            | Token + sáu màn đại diện + component catalog trước khi mở rộng                  |
| Thiếu bản dịch hoặc tài nguyên nhận diện          | Ra mắt tiếng Việt đầy đủ; không tạo bản dịch giả; theo dõi nội dung thiếu riêng |

## Trình tự bắt đầu khi chuyển sang viết code

1. Chốt ADR và cấu trúc repo theo tài liệu kiến trúc.
2. Khởi tạo hai app và hạ tầng local, kiểm tra một request qua toàn bộ stack.
3. Thiết lập token/admin shell và một public template đại diện.
4. Hoàn thành identity và luồng publish đầu tiên với DB thật.
5. Chạy kiểm thử read-after-commit, quyền và concurrency trước khi nhân rộng sang các module tiếp theo.
