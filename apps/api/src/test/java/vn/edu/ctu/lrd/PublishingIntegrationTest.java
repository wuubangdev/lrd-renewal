package vn.edu.ctu.lrd;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import vn.edu.ctu.lrd.media.application.port.ObjectStorage;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.ByteArrayInputStream;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.*;
import java.security.KeyPairGenerator;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import javax.imageio.ImageIO;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "lrd.storage.enabled=false",
            "lrd.bootstrap.email=",
            "lrd.bootstrap.password="
        })
@Import(PublishingIntegrationTest.Storage.class)
class PublishingIntegrationTest {
    static final GenericContainer<?> POSTGRES =
            new GenericContainer<>("postgres:18.6")
                    .withEnv("POSTGRES_DB", "lrd_test")
                    .withEnv("POSTGRES_USER", "lrd")
                    .withEnv("POSTGRES_PASSWORD", "integration-only")
                    .withExposedPorts(5432)
                    .waitingFor(
                            Wait.forLogMessage(
                                    ".*database system is ready to accept connections.*\\n", 2));

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) throws Exception {
        registry.add(
                "spring.datasource.url",
                () ->
                        "jdbc:postgresql://"
                                + POSTGRES.getHost()
                                + ":"
                                + POSTGRES.getMappedPort(5432)
                                + "/lrd_test");
        registry.add("spring.datasource.username", () -> "lrd");
        registry.add("spring.datasource.password", () -> "integration-only");
        var generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        var pair = generator.generateKeyPair();
        registry.add(
                "lrd.auth.private-key",
                () -> Base64.getEncoder().encodeToString(pair.getPrivate().getEncoded()));
        registry.add(
                "lrd.auth.public-key",
                () -> Base64.getEncoder().encodeToString(pair.getPublic().getEncoded()));
    }

    @TestConfiguration
    static class Storage {
        @Bean
        ObjectStorage objectStorage() {
            return new ObjectStorage() {
                final Map<String, byte[]> bytes = new ConcurrentHashMap<>();

                public void put(String key, String mime, byte[] input) {
                    bytes.put(key, input.clone());
                }

                public byte[] get(String key) {
                    return bytes.get(key).clone();
                }

                public void delete(String key) {
                    bytes.remove(key);
                }
            };
        }
    }

    @Value("${local.server.port}")
    int port;

    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired PasswordEncoder passwords;
    private static final String PASSWORD = "integration-password-123!";

    private Client account(String role) throws Exception {
        var id = UUID.randomUUID();
        String email = id + "@test.invalid";
        jdbc.update(
                "insert into"
                    + " identity.account(id,email,display_name,password_hash,role,active,auth_version,created_at)"
                    + " values(?,?,?,?,?,true,0,?)",
                id,
                email,
                "Tài khoản kiểm thử",
                passwords.encode(PASSWORD),
                role,
                java.sql.Timestamp.from(Instant.now()));
        var client = new Client();
        client.accountId = id;
        client.mutate("POST", "/auth/login", Map.of("email", email, "password", PASSWORD), Map.of())
                .expect(200);
        return client;
    }

    private Map<String, Object> draft(String title, String slug, String asset) {
        var document =
                Map.of(
                        "type",
                        "doc",
                        "content",
                        List.of(
                                Map.of(
                                        "type",
                                        "paragraph",
                                        "content",
                                        List.of(
                                                Map.of(
                                                        "type",
                                                        "text",
                                                        "text",
                                                        "Nội dung bài viết kiểm thử đủ dài để đăng"
                                                                + " công khai.")))));
        var draft = new HashMap<String, Object>();
        draft.put("title", title);
        draft.put("slug", slug);
        draft.put("summary", "Thông tin kiểm thử");
        draft.put("category", "TIN_TUC");
        draft.put("document", document);
        draft.put("coverId", asset);
        draft.put("coverAlt", asset == null ? "" : "Ảnh kiểm thử");
        return draft;
    }

    private JsonNode create(Client client) throws Exception {
        return client.mutate("POST", "/admin/content", Map.of("locale", "vi"), Map.of())
                .expect(201)
                .node();
    }

    private JsonNode save(Client client, JsonNode entry, Map<String, Object> draft)
            throws Exception {
        return client.mutate(
                        "PATCH",
                        "/admin/content/" + entry.get("id").asText() + "/draft",
                        draft,
                        version(entry))
                .expect(200)
                .node();
    }

    private Map<String, String> version(JsonNode entry) {
        return Map.of("If-Match", "\"" + entry.get("version").asLong() + "\"");
    }

    @Test
    void spreadsheetImportsStructuredDraftsAndLinksFacultyResearch() throws Exception {
        var admin = account("ADMIN");
        var token = UUID.randomUUID().toString().substring(0, 8);
        var staffSlug = "excel-staff-" + token;
        byte[] staff = fillWorkbook(admin.get("/admin/people/spreadsheet/template").expect(200).bytes,
                Map.of("People", List.of(List.of("p1", "Cán bộ Excel", staffSlug, "TS.", "Tiến sĩ", "", "", "", "", "", "Giảng viên", "Bộ môn Tài nguyên Đất đai")),
                        "Specialties", List.of(List.of("p1", "GIS")),
                        "Undergraduate", List.of(List.of("p1", "Đại học", "2010–2014", "Đại học Cần Thơ", "Địa lý")),
                        "WorkHistory", List.of(List.of("p1", "2015–nay", "Đại học Cần Thơ", "Giảng viên"))));
        var staffResult = admin.uploadSpreadsheet("/admin/people/spreadsheet/import", staff,
                Map.of("locale", "vi")).expect(200).node();
        assertThat(staffResult.get("created").asInt()).isEqualTo(1);
        var staffId = staffResult.get("ids").get(0).asText();
        var staffRecord = admin.get("/admin/people/" + staffId).expect(200).node();
        assertThat(staffRecord.get("draft").get("specialties").get(0).asText()).isEqualTo("GIS");
        assertThat(staffRecord.get("draft").get("academic").get("undergraduate").get(0).get("major").asText()).isEqualTo("Địa lý");
        assertThat(staffRecord.get("draft").get("academic").get("workHistory").get(0).get("role").asText()).isEqualTo("Giảng viên");
        admin.mutate("POST", "/admin/people/" + staffId + "/publish",
                Map.of("draftVersion", staffRecord.get("draftVersion").asLong()), version(staffRecord)).expect(200);

        byte[] research = fillWorkbook(admin.get("/admin/research/spreadsheet/template").expect(200).bytes,
                Map.of("Research", List.of(List.of("r1", "Nghiên cứu GIS trong đào tạo", "excel-research-" + token, "Mô tả", "2025")),
                        "Contributors", List.of(List.of("r1", "Cán bộ Excel", "AUTHOR", staffSlug))));
        var researchResult = admin.uploadSpreadsheet("/admin/research/spreadsheet/import", research,
                Map.of("locale", "vi", "kind", "JOURNAL_ARTICLE")).expect(200).node();
        var researchId = researchResult.get("ids").get(0).asText();
        var researchRecord = admin.get("/admin/research/" + researchId).expect(200).node();
        assertThat(researchRecord.get("draft").get("contributors").get(0).get("staffId").asText()).isEqualTo(staffId);
        assertThat(researchRecord.get("live").isNull()).isTrue();

        byte[] programs = fillWorkbook(admin.get("/admin/academics/programs/spreadsheet/template").expect(200).bytes,
                Map.of("Programs", List.of(List.of("g1", "EXCEL-" + token, "vi", "UNDERGRADUATE", "Chương trình Excel", "excel-program-" + token,
                                "Tóm tắt", "Giới thiệu chương trình đào tạo đủ dài để kiểm thử.", "ENGINEER", "Bộ môn", "48", "150", "Phòng đào tạo", "dao-tao@example.edu.vn")),
                        "Outcomes", List.of(List.of("g1", "Ứng dụng GIS")),
                        "Curricula", List.of(List.of("g1", "c1", "Khung 2025", "K50", "true", "2025-09-01")),
                        "Courses", List.of(List.of("g1", "c1", "GIS101", "GIS cơ bản", "3", "1", "false"))));
        var programResult = admin.uploadSpreadsheet("/admin/academics/programs/spreadsheet/import", programs,
                Map.of()).expect(200).node();
        var program = admin.get("/admin/academics/programs/" + programResult.get("ids").get(0).asText()).expect(200).node();
        assertThat(program.get("status").asText()).isEqualTo("DRAFT");
        assertThat(program.get("content").get("curricula").get(0).get("courses").get(0).get("code").asText()).isEqualTo("GIS101");

        byte[] invalid = fillWorkbook(admin.get("/admin/people/spreadsheet/template").expect(200).bytes,
                Map.of("People", List.of(List.of("x1", "Bản ghi sẽ rollback", "excel-rollback-" + token),
                        List.of("x2", "Bản ghi trùng", staffSlug))));
        admin.uploadSpreadsheet("/admin/people/spreadsheet/import", invalid, Map.of("locale", "vi")).expect(409);
        assertThat(admin.get("/admin/people?locale=vi").expect(200).node().toString()).doesNotContain("excel-rollback-" + token);
    }

    private byte[] fillWorkbook(byte[] template, Map<String, List<List<String>>> values) throws Exception {
        try (var workbook = new XSSFWorkbook(new ByteArrayInputStream(template));
                var output = new ByteArrayOutputStream()) {
            for (var sheetEntry : values.entrySet()) {
                var sheet = workbook.getSheet(sheetEntry.getKey());
                for (int i = 0; i < sheetEntry.getValue().size(); i++) {
                    var row = sheet.createRow(i + 1);
                    var columns = sheetEntry.getValue().get(i);
                    for (int c = 0; c < columns.size(); c++) row.createCell(c).setCellValue(columns.get(c));
                }
            }
            workbook.write(output);
            return output.toByteArray();
        }
    }

    private Reply publish(Client client, JsonNode entry, String key) throws Exception {
        var headers = new HashMap<>(version(entry));
        headers.put("Idempotency-Key", key);
        return client.mutate(
                "POST",
                "/admin/content/" + entry.get("id").asText() + "/publish",
                Map.of("draftVersion", entry.get("draftVersion").asLong()),
                headers);
    }

    @Test
    void editorialBylineIsIndependentFromPublishingAccountAndDraftChanges() throws Exception {
        var editor = account("ADMIN");
        var reader = new Client();
        var entry = create(editor);
        var id = entry.get("id").asText();
        var slug = "byline-" + UUID.randomUUID();
        var input = draft("Bài viết có tác giả riêng", slug, null);
        input.put("byline", "TS. Nguyễn Thị Tác Giả");
        entry = save(editor, entry, input);
        entry = publish(editor, entry, UUID.randomUUID().toString()).expect(200).node();
        assertThat(reader.get("/public/content/" + id).expect(200).node().get("byline").asText())
                .isEqualTo("TS. Nguyễn Thị Tác Giả");
        assertThat(jdbc.queryForObject("select author_name from discovery.search_document where source_id=?",
                String.class, UUID.fromString(id))).isEqualTo("TS. Nguyễn Thị Tác Giả");
        input.put("byline", "Tác giả bản nháp");
        entry = save(editor, entry, input);
        assertThat(reader.get("/public/content/" + id).expect(200).node().get("byline").asText())
                .isEqualTo("TS. Nguyễn Thị Tác Giả");
        publish(editor, entry, UUID.randomUUID().toString()).expect(200);
        assertThat(reader.get("/public/content/" + id).expect(200).node().get("byline").asText())
                .isEqualTo("Tác giả bản nháp");
    }

    @Test
    void categoriesCanBeManagedAndUsedToFilterArticlesButNotDeletedWhileReferenced() throws Exception {
        var admin = account("ADMIN");
        var author = account("AUTHOR");
        var code = "CUSTOM_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        var input = Map.of("code", code, "nameVi", "Hợp tác học thuật",
                "nameEn", "Academic partnerships", "sortOrder", 75);
        author.mutate("POST", "/admin/categories", input, Map.of()).expect(403);
        admin.mutate("POST", "/admin/categories", input, Map.of()).expect(201);
        assertThat(admin.get("/public/categories").expect(200).node().toString()).contains(code);
        admin.mutate("PUT", "/admin/categories/" + code,
                Map.of("nameVi", "Hợp tác quốc tế", "nameEn", "International cooperation", "sortOrder", 80),
                Map.of()).expect(200);
        var entry = create(admin);
        var draft = draft("Bài hợp tác kiểm thử", "category-" + UUID.randomUUID(), null);
        draft.put("category", code);
        save(admin, entry, draft);
        var list = admin.get("/admin/content?category=" + code + "&q=h%E1%BB%A3p%20t%C3%A1c&status=DRAFT")
                .expect(200).node();
        assertThat(list.get("total").asLong()).isEqualTo(1);
        assertThat(list.get("items").get(0).get("id").asText()).isEqualTo(entry.get("id").asText());
        admin.mutate("DELETE", "/admin/categories/" + code, Map.of(), Map.of()).expect(409);
    }

    @Test
    void staffProfileUsesStructuredFieldsAndKeepsPrivateNotesOutOfPublicView() throws Exception {
        var admin = account("ADMIN");
        var profile = admin.mutate("POST", "/admin/people", Map.of("locale", "vi"), Map.of())
                .expect(201).node();
        var id = profile.get("id").asText();
        var slug = "test-staff-" + UUID.randomUUID();
        var details = new HashMap<String, Object>();
        details.put("name", "Nguyễn Văn Kiểm Thử");
        details.put("slug", slug);
        details.put("academicTitle", "TS.");
        details.put("degree", "Tiến sĩ");
        details.put("position", "Giảng viên");
        details.put("unit", "Bộ môn Tài nguyên Đất đai");
        details.put("email", "staff@ctu.edu.vn");
        details.put("phone", ""); details.put("office", ""); details.put("website", "");
        details.put("summary", "Nghiên cứu tài nguyên đất đai.");
        details.put("specialties", List.of("GIS"));
        details.put("portraitAlt", ""); details.put("template", "ACADEMIC");
        details.put("sections", List.of(Map.of("title", "Quá trình đào tạo", "blocks", List.of(
                Map.of("kind", "TEXT", "text", "Đại học Cần Thơ", "items", List.of(),
                        "rows", List.of(), "alt", "")))));
        details.put("privateNotes", "Địa chỉ riêng không công khai");
        details.put("privateFacts", List.of(Map.of("label", "Ngày sinh", "value", "01/01/1980")));
        profile = admin.mutate("PATCH", "/admin/people/" + id + "/draft", details, version(profile))
                .expect(200).node();
        profile = admin.mutate("POST", "/admin/people/" + id + "/publish",
                Map.of("draftVersion", profile.get("draftVersion").asLong()), version(profile))
                .expect(200).node();
        var publicView = new Client().get("/public/people/" + slug + "?locale=vi").expect(200).node();
        assertThat(publicView.get("details").get("name").asText()).isEqualTo("Nguyễn Văn Kiểm Thử");
        assertThat(publicView.toString()).doesNotContain("Địa chỉ riêng không công khai");
        assertThat(publicView.toString()).doesNotContain("01/01/1980");
        details.put("name", "Nguyễn Văn Kiểm Thử Mới");
        admin.mutate("PATCH", "/admin/people/" + id + "/draft", details, version(profile)).expect(200);
        assertThat(new Client().get("/public/people/" + slug + "?locale=vi").expect(200)
                .node().get("details").get("name").asText()).isEqualTo("Nguyễn Văn Kiểm Thử");
    }

    @Test
    void laboratoryIsStructuredAndDraftEditsDoNotChangePublicPage() throws Exception {
        var admin = account("ADMIN");
        var lab = admin.mutate("POST", "/admin/laboratories", Map.of("locale", "vi"), Map.of())
                .expect(201).node();
        var id = lab.get("id").asText();
        var slug = "test-lab-" + UUID.randomUUID();
        var details = new HashMap<String, Object>();
        details.put("name", "Phòng thí nghiệm kiểm thử");
        details.put("slug", slug);
        details.put("shortName", "Test Laboratory");
        details.put("lead", "TS. Nguyễn Văn A");
        details.put("location", "Đại học Cần Thơ");
        details.put("email", "lab@ctu.edu.vn");
        details.put("phone", "");
        details.put("summary", "Thực hành và nghiên cứu GIS.");
        details.put("coverAlt", "");
        details.put("template", "DOSSIER");
        details.put("sections", List.of(Map.of("title", "Thiết bị", "blocks", List.of(
                Map.of("kind", "FACT", "text", "Máy đo", "value", "02 bộ", "items", List.of(),
                        "rows", List.of(), "alt", "")))));
        lab = admin.mutate("PATCH", "/admin/laboratories/" + id + "/draft", details, version(lab))
                .expect(200).node();
        lab = admin.mutate("POST", "/admin/laboratories/" + id + "/publish",
                Map.of("draftVersion", lab.get("draftVersion").asLong()), version(lab))
                .expect(200).node();
        var publicView = new Client().get("/public/laboratories/" + slug + "?locale=vi").expect(200).node();
        assertThat(publicView.get("details").get("sections").get(0).get("blocks").get(0).get("value").asText())
                .isEqualTo("02 bộ");
        details.put("name", "Tên bản nháp mới");
        admin.mutate("PATCH", "/admin/laboratories/" + id + "/draft", details, version(lab)).expect(200);
        assertThat(new Client().get("/public/laboratories/" + slug + "?locale=vi").expect(200)
                .node().get("details").get("name").asText()).isEqualTo("Phòng thí nghiệm kiểm thử");
    }

    @Test
    void researchLinksPublishedStaffAndKeepsDraftChangesPrivate() throws Exception {
        var admin = account("ADMIN");
        var reader = new Client();
        var staff = admin.mutate("POST", "/admin/people", Map.of("locale", "vi"), Map.of()).expect(201).node();
        var staffId = staff.get("id").asText();
        var person = new HashMap<String, Object>();
        person.put("name", "Nguyễn Thị Nghiên Cứu"); person.put("slug", "research-staff-" + UUID.randomUUID());
        person.put("academicTitle", "TS."); person.put("degree", "Tiến sĩ");
        person.put("position", "Giảng viên"); person.put("unit", "Bộ môn Tài nguyên Đất đai");
        person.put("email", "research@ctu.edu.vn"); person.put("phone", "");
        person.put("office", ""); person.put("website", ""); person.put("summary", "Nghiên cứu GIS.");
        person.put("specialties", List.of("GIS")); person.put("portraitAlt", "");
        person.put("template", "ACADEMIC"); person.put("sections", List.of());
        person.put("privateNotes", ""); person.put("privateFacts", List.of());
        staff = admin.mutate("PATCH", "/admin/people/" + staffId + "/draft", person, version(staff)).expect(200).node();
        staff = admin.mutate("POST", "/admin/people/" + staffId + "/publish",
                Map.of("draftVersion", staff.get("draftVersion").asLong()), version(staff)).expect(200).node();

        var work = admin.mutate("POST", "/admin/research", Map.of("kind", "TEXTBOOK", "locale", "vi"), Map.of())
                .expect(201).node();
        var workId = work.get("id").asText();
        var slug = "research-test-" + UUID.randomUUID();
        var details = new HashMap<String, Object>();
        details.put("title", "Giáo trình viễn thám kiểm thử"); details.put("slug", slug);
        details.put("summary", "Giáo trình nghiên cứu GIS."); details.put("year", 2026);
        details.put("publisher", "Nhà xuất bản Đại học Cần Thơ");
        details.put("authorsText", "Nguyễn Thị Nghiên Cứu, Tác giả ngoài đơn vị");
        details.put("citation", "Nguyễn Thị Nghiên Cứu. 2026. Giáo trình viễn thám kiểm thử.");
        details.put("contributors", List.of(Map.of("staffId", staffId, "name", "Nguyễn Thị Nghiên Cứu", "role", "AUTHOR")));
        work = admin.mutate("PATCH", "/admin/research/" + workId + "/draft", details, version(work)).expect(200).node();
        reader.get("/public/research/" + slug + "?locale=vi").expect(404);
        work = admin.mutate("POST", "/admin/research/" + workId + "/publish",
                Map.of("draftVersion", work.get("draftVersion").asLong()), version(work)).expect(200).node();
        var publicWork = reader.get("/public/research/" + slug + "?locale=vi").expect(200).node();
        assertThat(publicWork.get("authors").get(0).get("staffUrl").asText()).contains(person.get("slug").toString());
        assertThat(reader.get("/public/research/by-staff/" + staffId + "?locale=vi").expect(200).node().toString())
                .contains(workId);
        details.put("title", "Tên bản nháp chưa đăng");
        work = admin.mutate("PATCH", "/admin/research/" + workId + "/draft", details, version(work)).expect(200).node();
        assertThat(reader.get("/public/research/" + slug + "?locale=vi").expect(200).node()
                .get("details").get("title").asText()).isEqualTo("Giáo trình viễn thám kiểm thử");
        admin.mutate("POST", "/admin/research/" + workId + "/withdraw", Map.of(), version(work)).expect(200);
        reader.get("/public/research/" + slug + "?locale=vi").expect(404);
        assertThat(reader.get("/public/research/by-staff/" + staffId + "?locale=vi").expect(200).node().toString())
                .doesNotContain(workId);
    }

    @Test
    void editorialItemRequiresOnePublishedArticleAndFollowsItsVisibility() throws Exception {
        var admin = account("ADMIN");
        var reader = new Client();
        var article = create(admin);
        var articleId = article.get("id").asText();
        article = save(admin, article, draft("Nội dung hội thảo kiểm thử", "event-article-" + UUID.randomUUID(), null));
        var item = admin.mutate("POST", "/admin/editorial", Map.of("kind", "EVENT", "locale", "vi"), Map.of())
                .expect(201).node();
        var id = item.get("id").asText();
        var slug = "event-" + UUID.randomUUID();
        var details = new HashMap<String, Object>();
        details.put("title", "Hội thảo kiểm thử");
        details.put("slug", slug);
        details.put("summary", "Chương trình chuyên đề về quản lý đất đai.");
        details.put("thumbnailAlt", "");
        details.put("externalUrl", "");
        details.put("articleId", articleId);
        details.put("location", "Đại học Cần Thơ");
        details.put("organizer", "Bộ môn Tài nguyên Đất đai");
        details.put("employer", "");
        details.put("position", "");
        item = admin.mutate("PATCH", "/admin/editorial/" + id + "/draft", details, version(item))
                .expect(200).node();
        admin.mutate("POST", "/admin/editorial/" + id + "/publish",
                Map.of("draftVersion", item.get("draftVersion").asLong()), version(item)).expect(422);
        article = publish(admin, article, UUID.randomUUID().toString()).expect(200).node();
        item = admin.mutate("POST", "/admin/editorial/" + id + "/publish",
                Map.of("draftVersion", item.get("draftVersion").asLong()), version(item)).expect(200).node();
        var publicView = reader.get("/public/editorial/" + slug + "?kind=EVENT&locale=vi").expect(200).node();
        assertThat(publicView.get("details").get("title").asText()).isEqualTo("Hội thảo kiểm thử");
        assertThat(publicView.get("articleUrl").asText()).contains(article.get("slug").asText());
        var second = admin.mutate("POST", "/admin/editorial", Map.of("kind", "NEWS", "locale", "vi"), Map.of())
                .expect(201).node();
        details.put("slug", "news-" + UUID.randomUUID());
        admin.mutate("PATCH", "/admin/editorial/" + second.get("id").asText() + "/draft",
                details, version(second)).expect(422);
        var alternate = create(admin);
        alternate = save(admin, alternate, draft("Bài thay thế", "alternate-" + UUID.randomUUID(), null));
        alternate = publish(admin, alternate, UUID.randomUUID().toString()).expect(200).node();
        details.put("articleId", alternate.get("id").asText());
        details.put("slug", slug);
        admin.mutate("PATCH", "/admin/editorial/" + id + "/draft", details, version(item)).expect(200);
        details.put("articleId", articleId);
        details.put("slug", "news-" + UUID.randomUUID());
        admin.mutate("PATCH", "/admin/editorial/" + second.get("id").asText() + "/draft",
                details, version(second)).expect(422);
        admin.mutate("POST", "/admin/content/" + articleId + "/withdraw", Map.of(), version(article)).expect(200);
        reader.get("/public/editorial/" + slug + "?kind=EVENT&locale=vi").expect(404);
    }

    @Test
    void completePublicationKeepsDraftPrivateAndMovesAllPublicProjectionsTogether()
            throws Exception {
        var client = account("ADMIN");
        var reader = new Client();
        var entry = create(client);
        String id = entry.get("id").asText(), slug = "integration-" + UUID.randomUUID();
        var asset = client.upload(false).expect(201).node();
        String image = asset.get("id").asText();
        reader.get("/public/media/" + image).expect(404);
        entry = save(client, entry, draft("Bài kiểm thử đầu tiên", slug, image));
        reader.get("/public/content/" + id).expect(404);
        String key = UUID.randomUUID().toString();
        var original = entry;
        entry = publish(client, entry, key).expect(200).node();
        publish(client, original, key).expect(200);
        assertThat(client.get("/admin/content/" + id + "/revisions").expect(200).node().size())
                .isEqualTo(1);
        reader.get("/public/media/" + image).expect(200);
        assertThat(
                        reader.get("/public/content/by-slug/" + slug)
                                .expect(200)
                                .node()
                                .get("title")
                                .asText())
                .isEqualTo("Bài kiểm thử đầu tiên");
        var revised = save(client, entry, draft("Bản nháp chưa công khai", slug + "-moi", image));
        assertThat(reader.get("/public/content/" + id).expect(200).node().get("title").asText())
                .isEqualTo("Bài kiểm thử đầu tiên");
        revised = publish(client, revised, UUID.randomUUID().toString()).expect(200).node();
        assertThat(
                        reader.get("/public/content/by-slug/" + slug)
                                .expect(200)
                                .node()
                                .get("slug")
                                .asText())
                .isEqualTo(slug + "-moi");
        assertThat(
                        reader.get("/public/search?q=" + slug + "-moi")
                                .expect(200)
                                .node()
                                .get("total")
                                .asInt())
                .isZero(); // search is based on visible title/body
        var withdrawn =
                client.mutate(
                                "POST",
                                "/admin/content/" + id + "/withdraw",
                                Map.of(),
                                version(revised))
                        .expect(200)
                        .node();
        reader.get("/public/content/" + id).expect(404);
        reader.get("/public/media/" + image).expect(404);
        reader.get("/public/content/by-slug/" + slug).expect(404);
        assertThat(
                        jdbc.queryForObject(
                                "select count(*) from discovery.search_document where source_id=? ",
                                Integer.class,
                                UUID.fromString(id)))
                .isZero();
        var history = client.get("/admin/content/" + id + "/revisions").expect(200).node();
        client.mutate(
                        "POST",
                        "/admin/content/" + id + "/restore-revision",
                        Map.of("revisionId", history.get(1).get("id").asText()),
                        version(withdrawn))
                .expect(200);
        reader.get("/public/content/" + id).expect(404);
    }

    @Test
    void optimisticLockAndSlugCollisionNeverOverwriteAnotherPublication() throws Exception {
        var client = account("EDITOR");
        var first = create(client);
        String slug = "collision-" + UUID.randomUUID();
        var stale = first;
        first = save(client, first, draft("Bài thứ nhất hợp lệ", slug, null));
        client.mutate(
                        "PATCH",
                        "/admin/content/" + first.get("id").asText() + "/draft",
                        draft("Ghi đè từ tab cũ", slug, null),
                        version(stale))
                .expect(412);
        first = publish(client, first, UUID.randomUUID().toString()).expect(200).node();
        var second = save(client, create(client), draft("Bài có đường dẫn trùng", slug, null));
        publish(client, second, UUID.randomUUID().toString()).expect(409);
        new Client().get("/public/content/" + second.get("id").asText()).expect(404);
        assertThat(
                        client.get("/admin/content/" + second.get("id").asText() + "/revisions")
                                .expect(200)
                                .node()
                                .size())
                .isZero();
        assertThat(
                        new Client()
                                .get("/public/content/by-slug/" + slug)
                                .expect(200)
                                .node()
                                .get("id")
                                .asText())
                .isEqualTo(first.get("id").asText());
    }

    @Test
    void backendChecksOwnershipAndRevokesDisabledSessions() throws Exception {
        var owner = account("AUTHOR");
        var stranger = account("AUTHOR");
        var content = create(owner);
        stranger.get("/admin/content/" + content.get("id").asText()).expect(403);
        var asset = owner.upload(false).expect(201).node();
        var own = create(stranger);
        stranger.mutate(
                        "PATCH",
                        "/admin/content/" + own.get("id").asText() + "/draft",
                        draft(
                                "Không được dùng ảnh người khác",
                                "ownership-" + UUID.randomUUID(),
                                asset.get("id").asText()),
                        version(own))
                .expect(403);
        jdbc.update(
                "update identity.account set active=false,auth_version=auth_version+1 where id=?",
                owner.accountId);
        owner.get("/auth/me").expect(401);
    }

    @Test
    void csrfOriginAndLogoutProtectCookieSession() throws Exception {
        var client = account("ADMIN");
        client.send(
                        "POST",
                        "/admin/content",
                        "{}".getBytes(),
                        Map.of("Content-Type", "application/json"))
                .expect(403);
        client.mutate(
                        "POST",
                        "/admin/content",
                        Map.of("locale", "vi"),
                        Map.of("Origin", "https://untrusted.invalid"))
                .expect(403);
        client.mutate("POST", "/auth/logout", Map.of(), Map.of()).expect(204);
        client.get("/auth/me").expect(401);
        client.get("/admin/content").expect(401);
    }

    @Test
    void uploadValidatesImageBytesAndStoresReencodedData() throws Exception {
        var client = account("ADMIN");
        client.upload(true).expect(422);
        var asset = client.upload(false).expect(201).node();
        assertThat(asset.get("contentType").asText()).isEqualTo("image/jpeg");
        assertThat(asset.get("width").asInt()).isEqualTo(80);
        assertThat(client.get("/admin/media/" + asset.get("id").asText()).expect(200).bytes.length)
                .isPositive();
    }

    private JsonNode accountView(Client admin, UUID id) throws Exception {
        var page = admin.get("/admin/users?q=" + id + "%40test.invalid").expect(200).node();
        return page.get("items").get(0);
    }

    @Test
    void invitationsResetPasswordsRoleChangesAndPasswordChangesRevokeSessions() throws Exception {
        var admin = account("ADMIN");
        String email = UUID.randomUUID() + "@test.invalid";
        var invitation =
                admin.mutate(
                                "POST",
                                "/admin/users",
                                Map.of(
                                        "email",
                                        email,
                                        "name",
                                        "Người được mời",
                                        "role",
                                        "AUTHOR",
                                        "active",
                                        true),
                                Map.of())
                        .expect(201)
                        .node();
        var invited = invitation.get("account");
        assertThat(invited.has("passwordHash")).isFalse();
        assertThat(invited.get("passwordSet").asBoolean()).isFalse();
        String token = invitation.get("reset").get("token").asText();
        String stored =
                jdbc.queryForObject(
                        "select token_hash from identity.password_reset where account_id=?",
                        String.class,
                        UUID.fromString(invited.get("id").asText()));
        assertThat(stored).hasSize(64).isNotEqualTo(token);
        var person = new Client();
        person.mutate(
                        "POST",
                        "/auth/reset-password",
                        Map.of("token", token, "password", PASSWORD),
                        Map.of())
                .expect(204);
        person.mutate(
                        "POST",
                        "/auth/reset-password",
                        Map.of("token", token, "password", PASSWORD),
                        Map.of())
                .expect(422);
        person.mutate("POST", "/auth/login", Map.of("email", email, "password", PASSWORD), Map.of())
                .expect(200);
        person.get("/admin/users").expect(403);
        person.get("/admin/roles").expect(403);
        person.get("/admin/site/home").expect(403);
        person.mutate(
                        "POST",
                        "/admin/users",
                        Map.of(
                                "email",
                                "escalate@test.invalid",
                                "name",
                                "Bad",
                                "role",
                                "ADMIN",
                                "active",
                                true),
                        Map.of())
                .expect(403);
        var user = admin.get("/admin/users?q=" + email).expect(200).node().get("items").get(0);
        user =
                admin.mutate(
                                "PATCH",
                                "/admin/users/" + user.get("id").asText(),
                                Map.of(
                                        "email",
                                        email,
                                        "name",
                                        "Biên tập",
                                        "role",
                                        "EDITOR",
                                        "active",
                                        true),
                                version(user))
                        .expect(200)
                        .node();
        person.get("/auth/me").expect(401);
        person.mutate("POST", "/auth/login", Map.of("email", email, "password", PASSWORD), Map.of())
                .expect(200);
        assertThat(person.get("/auth/me").expect(200).node().get("permissions").toString())
                .contains("content:update:any")
                .doesNotContain("identity:manage");
        var otherDevice = new Client();
        otherDevice
                .mutate(
                        "POST",
                        "/auth/login",
                        Map.of("email", email, "password", PASSWORD),
                        Map.of())
                .expect(200);
        person.mutate(
                        "POST",
                        "/auth/change-password",
                        Map.of("currentPassword", "wrong", "password", PASSWORD + "new"),
                        Map.of())
                .expect(422);
        person.mutate(
                        "POST",
                        "/auth/change-password",
                        Map.of("currentPassword", PASSWORD, "password", PASSWORD + "new"),
                        Map.of())
                .expect(204);
        otherDevice.get("/auth/me").expect(401);
        person.mutate("POST", "/auth/login", Map.of("email", email, "password", PASSWORD), Map.of())
                .expect(401);
        person.mutate(
                        "POST",
                        "/auth/login",
                        Map.of("email", email, "password", PASSWORD + "new"),
                        Map.of())
                .expect(200);
        var current = admin.get("/admin/users?q=" + email).expect(200).node().get("items").get(0);
        admin.mutate(
                        "PATCH",
                        "/admin/users/" + current.get("id").asText(),
                        Map.of(
                                "email",
                                email,
                                "name",
                                "Old version",
                                "role",
                                "AUTHOR",
                                "active",
                                true),
                        version(user))
                .expect(412);
        admin.mutate(
                        "POST",
                        "/admin/users/" + current.get("id").asText() + "/revoke-sessions",
                        Map.of(),
                        version(current))
                .expect(200);
        person.get("/auth/me").expect(401);
    }

    @Test
    void resetLinksExpireReplaceEarlierLinksAndCannotBypassCsrf() throws Exception {
        var admin = account("ADMIN");
        var person = account("AUTHOR");
        var user = accountView(admin, person.accountId);
        String endpoint = "/admin/users/" + person.accountId + "/reset-links";
        String first =
                admin.mutate("POST", endpoint, Map.of(), version(user))
                        .expect(200)
                        .node()
                        .get("token")
                        .asText();
        String second =
                admin.mutate("POST", endpoint, Map.of(), version(user))
                        .expect(200)
                        .node()
                        .get("token")
                        .asText();
        var anonymous = new Client();
        anonymous
                .mutate(
                        "POST",
                        "/auth/reset-password",
                        Map.of("token", first, "password", PASSWORD),
                        Map.of())
                .expect(422);
        anonymous
                .send(
                        "POST",
                        "/auth/reset-password",
                        json.writeValueAsBytes(Map.of("token", second, "password", PASSWORD)),
                        Map.of("Content-Type", "application/json"))
                .expect(403);
        person.get("/auth/me").expect(200); // issuing a reset link does not lock out the user
        jdbc.update(
                "update identity.password_reset set expires_at=now()-interval '1 second' where"
                        + " account_id=?",
                person.accountId);
        anonymous
                .mutate(
                        "POST",
                        "/auth/reset-password",
                        Map.of("token", second, "password", PASSWORD),
                        Map.of())
                .expect(422);
        String third =
                admin.mutate("POST", endpoint, Map.of(), version(user))
                        .expect(200)
                        .node()
                        .get("token")
                        .asText();
        anonymous
                .mutate(
                        "POST",
                        "/auth/reset-password",
                        Map.of("token", third, "password", PASSWORD + "reset"),
                        Map.of())
                .expect(204);
        person.get("/auth/me").expect(401);
        assertThat(
                        jdbc.queryForObject(
                                "select count(*) from identity.password_reset where account_id=?"
                                        + " and used_at is null",
                                Integer.class,
                                person.accountId))
                .isZero();
    }

    @Test
    void concurrentDisablingCannotRemoveTheLastActivatedAdministrator() throws Exception {
        // This container is dedicated to this test class; remove prior test administrators from the
        // count.
        jdbc.update(
                "update identity.account set role='AUTHOR',auth_version=auth_version+1 where"
                        + " role='ADMIN'");
        var first = account("ADMIN");
        var second = account("ADMIN");
        var one = accountView(first, first.accountId);
        var two = accountView(second, second.accountId);
        var latch = new java.util.concurrent.CountDownLatch(1);
        try (var pool = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var a =
                    pool.submit(
                            () -> {
                                latch.await();
                                return first.mutate(
                                        "PATCH",
                                        "/admin/users/" + first.accountId,
                                        Map.of(
                                                "email",
                                                one.get("email").asText(),
                                                "name",
                                                "First",
                                                "role",
                                                "AUTHOR",
                                                "active",
                                                false),
                                        version(one));
                            });
            var b =
                    pool.submit(
                            () -> {
                                latch.await();
                                return second.mutate(
                                        "PATCH",
                                        "/admin/users/" + second.accountId,
                                        Map.of(
                                                "email",
                                                two.get("email").asText(),
                                                "name",
                                                "Second",
                                                "role",
                                                "AUTHOR",
                                                "active",
                                                false),
                                        version(two));
                            });
            latch.countDown();
            assertThat(List.of(a.get().status, b.get().status)).containsExactlyInAnyOrder(200, 422);
        }
        assertThat(
                        jdbc.queryForObject(
                                "select count(*) from identity.account where active and"
                                        + " password_set and role='ADMIN'",
                                Integer.class))
                .isEqualTo(1);
    }

    @Test
    void homepageDraftPublicationHistoryAndMediaMoveAtomically() throws Exception {
        var admin = account("ADMIN");
        var reader = new Client();
        var home = admin.get("/admin/site/home").expect(200).node();
        var original = reader.get("/public/site/home").expect(200).node().get("content");
        var asset = admin.upload(false).expect(201).node().get("id").asText();
        var slideAsset = admin.upload(false).expect(201).node().get("id").asText();
        var content = (tools.jackson.databind.node.ObjectNode) home.get("content").deepCopy();
        ((tools.jackson.databind.node.ObjectNode) content.get("hero"))
                .put("title", "Thông điệp mới từ CMS");
        content.put("heroImageId", asset);
        content.put("heroImageAlt", "Ảnh mới của trang chủ");
        var slide = content.putArray("heroSlides").addObject();
        slide.set("content", content.get("hero").deepCopy());
        slide.put("imageId", slideAsset);
        slide.put("imageAlt", "Ảnh banner thứ hai");
        var saved =
                admin.mutate("PATCH", "/admin/site/home", content, version(home))
                        .expect(200)
                        .node();
        assertThat(reader.get("/public/site/home").expect(200).node().get("content"))
                .isEqualTo(original);
        reader.get("/public/media/" + asset).expect(404);
        reader.get("/public/media/" + slideAsset).expect(404);
        admin.mutate("PATCH", "/admin/site/home", content, version(home)).expect(412);
        var published =
                admin.mutate(
                                "POST",
                                "/admin/site/home/publish",
                                Map.of("draftVersion", saved.get("draftVersion").asLong()),
                                version(saved))
                        .expect(200)
                        .node();
        assertThat(
                        reader.get("/public/site/home")
                                .expect(200)
                                .node()
                                .get("content")
                                .get("hero")
                                .get("title")
                                .asText())
                .isEqualTo("Thông điệp mới từ CMS");
        reader.get("/public/media/" + asset).expect(200);
        reader.get("/public/media/" + slideAsset).expect(200);
        assertThat(reader.get("/public/site/home").expect(200).node().get("content").get("heroSlides"))
                .hasSize(1);
        reader.get("/admin/site/home/preview").expect(401);
        assertThat(reader.get("/public/site/home?locale=en").expect(200).node()
                .get("content").get("hero").get("title").asText())
                .isEqualTo("Understand land.\nShape the future.");
        var releases = admin.get("/admin/site/home/releases").expect(200).node();
        var restored =
                admin.mutate(
                                "POST",
                                "/admin/site/home/restore",
                                Map.of(
                                        "releaseId",
                                        releases.get(releases.size() - 1).get("id").asText()),
                                version(published))
                        .expect(200)
                        .node();
        reader.get("/public/media/" + asset).expect(200);
        admin.mutate(
                        "POST",
                        "/admin/site/home/publish",
                        Map.of("draftVersion", restored.get("draftVersion").asLong()),
                        version(restored))
                .expect(200);
        reader.get("/public/media/" + asset).expect(404);
        reader.get("/public/media/" + slideAsset).expect(404);
        account("EDITOR")
                .mutate("PATCH", "/admin/site/home", content, version(restored))
                .expect(403);
        admin.mutate("PATCH", "/admin/site/home", Map.of("hero", "invalid"), version(restored))
                .expect(422);
    }

    @Test
    void menusResolvePublishedArticlesAndHideWithdrawnTargets() throws Exception {
        var admin = account("ADMIN");
        var reader = new Client();
        var article =
                save(
                        admin,
                        create(admin),
                        draft("Bài liên kết menu", "menu-" + UUID.randomUUID(), null));
        var homeMenu = admin.get("/admin/site/menu").expect(200).node();
        var leaf =
                Map.of(
                        "id",
                        UUID.randomUUID().toString(),
                        "label",
                        "Bài mới",
                        "link",
                        Map.of("kind", "ARTICLE", "target", article.get("id").asText()),
                        "children",
                        List.of());
        var content =
                Map.of(
                        "items",
                        List.of(
                                Map.of(
                                        "id",
                                        UUID.randomUUID().toString(),
                                        "label",
                                        "Hoạt động",
                                        "link",
                                        Map.of("kind", "GROUP", "target", ""),
                                        "children",
                                        List.of(leaf))));
        var menu =
                admin.mutate("PATCH", "/admin/site/menu", content, version(homeMenu))
                        .expect(200)
                        .node();
        admin.mutate(
                        "POST",
                        "/admin/site/menu/publish",
                        Map.of("draftVersion", menu.get("draftVersion").asLong()),
                        version(menu))
                .expect(422);
        article = publish(admin, article, UUID.randomUUID().toString()).expect(200).node();
        admin.mutate(
                        "POST",
                        "/admin/site/menu/publish",
                        Map.of("draftVersion", menu.get("draftVersion").asLong()),
                        version(menu))
                .expect(200);
        assertThat(reader.get("/public/site/menu").expect(200).node().get("urls").toString())
                .contains(article.get("slug").asText());
        article = save(admin, article, draft("Tên mới", "menu-changed-" + UUID.randomUUID(), null));
        article = publish(admin, article, UUID.randomUUID().toString()).expect(200).node();
        assertThat(reader.get("/public/site/menu").expect(200).node().get("urls").toString())
                .contains(article.get("slug").asText());
        admin.mutate(
                        "POST",
                        "/admin/content/" + article.get("id").asText() + "/withdraw",
                        Map.of(),
                        version(article))
                .expect(200);
        assertThat(
                        reader.get("/public/site/menu")
                                .expect(200)
                                .node()
                                .get("content")
                                .get("items")
                                .size())
                .isZero();
    }

    private JsonNode academicCreate(Client client, String kind, String level) throws Exception {
        return client.mutate(
                        "POST",
                        "/admin/academics/" + kind,
                        Map.of(
                                "code",
                                "IT-" + UUID.randomUUID().toString().substring(0, 20),
                                "locale",
                                "vi",
                                "level",
                                level),
                        Map.of())
                .expect(201)
                .node();
    }

    private JsonNode academicSave(Client client, String kind, JsonNode view, Object draft)
            throws Exception {
        return client.mutate(
                        "PATCH",
                        "/admin/academics/" + kind + "/" + view.get("id").asText(),
                        draft,
                        version(view))
                .expect(200)
                .node();
    }

    private JsonNode academicPublish(Client client, String kind, JsonNode view) throws Exception {
        return client.mutate(
                        "POST",
                        "/admin/academics/" + kind + "/" + view.get("id").asText() + "/publish",
                        Map.of("draftVersion", view.get("draftVersion").asLong()),
                        version(view))
                .expect(200)
                .node();
    }

    private Map<String, Object> academicDraft(JsonNode view, String slug) {
        var d = new HashMap<String, Object>(json.convertValue(view.get("content"), Map.class));
        d.put("title", "Quản lý tài nguyên đất đai " + slug);
        d.put("slug", slug);
        d.put("summary", "Thông tin đào tạo đại học");
        d.put("description", "Nội dung chi tiết của chương trình đào tạo và thông báo tuyển sinh.");
        d.put("contact", Map.of("name", "Bộ môn", "email", "contact@ctu.edu.vn", "phone", ""));
        return d;
    }

    private JsonNode publishedProgram(Client client, String slug) throws Exception {
        var p = academicCreate(client, "programs", "UNDERGRADUATE");
        return academicPublish(
                client, "programs", academicSave(client, "programs", p, academicDraft(p, slug)));
    }

    private JsonNode admissionDraft(Client client, JsonNode program, String slug) throws Exception {
        var a = academicCreate(client, "admissions", "UNDERGRADUATE");
        var d = academicDraft(a, slug);
        d.put("programs", List.of(Map.of("programId", program.get("id").asText(), "quota", 40)));
        d.put("opensAt", Instant.now().minusSeconds(3600).toString());
        d.put("closesAt", Instant.now().plusSeconds(3600).toString());
        d.put("applicationUrl", "https://ctu.edu.vn");
        d.put("requirements", "Tốt nghiệp trung học phổ thông");
        d.put("selectionMethod", "Xét kết quả học tập");
        return academicSave(client, "admissions", a, d);
    }

    @Test
    void importedNoticesKeepEvidenceFilterCorrectlyAndSupportLatestHomeBlock() throws Exception {
        var admin = account("ADMIN");
        var reader = new Client();
        String slug = "notice-" + UUID.randomUUID();
        var p = publishedProgram(admin, slug + "-program");
        var a = admissionDraft(admin, p, slug);
        var d = academicDraft(a, slug);
        d.put("opensAt", null);
        d.put("closesAt", null);
        d.put(
                "source",
                Map.of(
                        "url",
                        "https://lrd.ctu.edu.vn/",
                        "publishedOn",
                        "2026-03-18",
                        "retrievedOn",
                        "2026-10-15"));
        d.put(
                "resources",
                List.of(
                        Map.of(
                                "label",
                                "Thông báo gốc",
                                "url",
                                "https://ctu.edu.vn/admissions.pdf")));
        a = academicSave(admin, "admissions", a, d);
        reader.get("/public/academics/admissions/" + slug).expect(404);
        a = academicPublish(admin, "admissions", a);
        var live = reader.get("/public/academics/admissions/" + slug).expect(200).node();
        assertThat(live.get("status").asText()).isEqualTo("NOTICE");
        assertThat(live.get("content").get("source").get("publishedOn").asText())
                .isEqualTo("2026-03-18");
        assertThat(live.get("content").get("resources").size()).isOne();
        assertThat(
                        reader.get(
                                        "/public/academics/admissions?status=NOTICE&program="
                                                + p.get("id").asText())
                                .expect(200)
                                .node()
                                .get("total")
                                .asLong())
                .isOne();
        assertThat(
                        reader.get(
                                        "/public/academics/admissions?status=OPEN&program="
                                                + p.get("id").asText())
                                .expect(200)
                                .node()
                                .get("total")
                                .asLong())
                .isZero();
        admin.mutate(
                        "POST",
                        "/admin/academics/programs/" + p.get("id").asText() + "/retire",
                        Map.of("reason", "Ngừng chương trình"),
                        version(p))
                .expect(422);

        var home = admin.get("/admin/site/home").expect(200).node();
        var original = json.convertValue(home.get("content"), Map.class);
        var composition = new HashMap<String, Object>(original);
        var sections = new ArrayList<String>((List<String>) composition.get("sections"));
        if (!sections.contains("ADMISSIONS")) sections.add("ADMISSIONS");
        composition.put("sections", sections);
        composition.put("admissionsMode", "LATEST");
        var saved =
                admin.mutate("PATCH", "/admin/site/home", composition, version(home))
                        .expect(200)
                        .node();
        assertThat(
                        admin.get("/admin/site/home/preview")
                                .expect(200)
                                .node()
                                .get("admissions")
                                .toString())
                .contains(a.get("id").asText());
        composition.put("admissionsMode", "OPEN");
        saved =
                admin.mutate("PATCH", "/admin/site/home", composition, version(saved))
                        .expect(200)
                        .node();
        assertThat(
                        admin.get("/admin/site/home/preview")
                                .expect(200)
                                .node()
                                .get("admissions")
                                .toString())
                .doesNotContain(a.get("id").asText());
        admin.mutate("PATCH", "/admin/site/home", original, version(saved)).expect(200);

        d.put("closesAt", Instant.now().minusSeconds(3600).toString());
        a = academicPublish(admin, "admissions", academicSave(admin, "admissions", a, d));
        assertThat(
                        reader.get("/public/academics/admissions/" + slug)
                                .expect(200)
                                .node()
                                .get("status")
                                .asText())
                .isEqualTo("CLOSED");
        assertThat(
                        reader.get(
                                        "/public/academics/admissions?status=CLOSED&program="
                                                + p.get("id").asText())
                                .expect(200)
                                .node()
                                .get("total")
                                .asLong())
                .isOne();
        assertThat(
                        reader.get(
                                        "/public/academics/admissions?status=NOTICE&program="
                                                + p.get("id").asText())
                                .expect(200)
                                .node()
                                .get("total")
                                .asLong())
                .isZero();
        a =
                admin.mutate(
                                "POST",
                                "/admin/academics/admissions/" + a.get("id").asText() + "/extend",
                                Map.of(
                                        "deadline",
                                        Instant.now().plusSeconds(3600).toString(),
                                        "reason",
                                        "Gia hạn theo văn bản mới"),
                                version(a))
                        .expect(200)
                        .node();
        live = reader.get("/public/academics/admissions/" + slug).expect(200).node();
        assertThat(live.get("status").asText()).isEqualTo("NOTICE");
        assertThat(live.get("deadlineChanges").size()).isOne();
        d.put("resources", List.of(Map.of("label", "Sai URL", "url", "javascript:alert(1)")));
        admin.mutate("PATCH", "/admin/academics/admissions/" + a.get("id").asText(), d, version(a))
                .expect(422);
    }

    @Test
    void academicPublicationIsIsolatedVersionedAndNamespacesDoNotCollide() throws Exception {
        var editor = account("EDITOR");
        var author = account("AUTHOR");
        var reader = new Client();
        String slug = "hoc-tap-" + UUID.randomUUID();
        author.get("/admin/academics/programs").expect(403);
        reader.get("/admin/academics/programs").expect(401);
        author.mutate(
                        "POST",
                        "/admin/academics/programs",
                        Map.of("code", "DENIED", "locale", "vi", "level", "MASTER"),
                        Map.of())
                .expect(403);
        var p = academicCreate(editor, "programs", "UNDERGRADUATE");
        var asset = editor.upload(false).expect(201).node().get("id").asText();
        var d = academicDraft(p, slug);
        d.put("coverId", asset);
        d.put("coverAlt", "Ảnh chương trình");
        d.put(
                "curricula",
                List.of(
                        Map.of(
                                "id",
                                UUID.randomUUID(),
                                "name",
                                "Khung khóa 52",
                                "cohort",
                                "52",
                                "current",
                                true,
                                "effectiveFrom",
                                "2026-09-01",
                                "documentUrl",
                                "https://ctu.edu.vn/curriculum.pdf",
                                "courses",
                                List.of())));
        p = academicSave(editor, "programs", p, d);
        reader.get("/public/academics/programs/" + slug).expect(404);
        reader.get("/public/media/" + asset).expect(404);
        p = academicPublish(editor, "programs", p);
        reader.get("/public/media/" + asset).expect(200);
        var live = reader.get("/public/academics/programs/" + slug).expect(200).node();
        assertThat(live.get("content").get("curricula").size()).isOne();
        var old = p;
        d.put("title", "Nội dung đang biên tập chưa công khai");
        d.put("slug", slug + "-moi");
        p = academicSave(editor, "programs", p, d);
        editor.mutate("PATCH", "/admin/academics/programs/" + p.get("id").asText(), d, version(old))
                .expect(412);
        assertThat(
                        reader.get("/public/academics/programs/" + slug)
                                .expect(200)
                                .node()
                                .get("content")
                                .get("title")
                                .asText())
                .startsWith("Quản lý");
        p = academicPublish(editor, "programs", p);
        assertThat(
                        reader.get("/public/academics/programs/" + slug)
                                .expect(200)
                                .node()
                                .get("content")
                                .get("slug")
                                .asText())
                .isEqualTo(slug + "-moi");
        var a = academicPublish(editor, "admissions", admissionDraft(editor, p, slug + "-moi"));
        reader.get("/public/academics/admissions/" + slug + "-moi").expect(200);
        assertThat(
                        reader.get("/public/academics/programs?q=noi%20dung&level=UNDERGRADUATE")
                                .expect(200)
                                .node()
                                .get("items")
                                .toString())
                .contains(p.get("id").asText());
        reader.get("/public/academics/admissions?status=CLOSED_EARLY").expect(200);
        var duplicate = academicCreate(editor, "programs", "UNDERGRADUATE");
        duplicate =
                academicSave(
                        editor, "programs", duplicate, academicDraft(duplicate, slug + "-moi"));
        editor.mutate(
                        "POST",
                        "/admin/academics/programs/" + duplicate.get("id").asText() + "/publish",
                        Map.of("draftVersion", duplicate.get("draftVersion").asLong()),
                        version(duplicate))
                .expect(409);
        var history =
                editor.get("/admin/academics/programs/" + p.get("id").asText() + "/editions")
                        .expect(200)
                        .node();
        p =
                editor.mutate(
                                "POST",
                                "/admin/academics/programs/" + p.get("id").asText() + "/restore",
                                Map.of(
                                        "editionId",
                                        history.get(history.size() - 1).get("id").asText()),
                                version(p))
                        .expect(200)
                        .node();
        assertThat(p.get("status").asText()).isEqualTo("CHANGED");
        assertThat(
                        reader.get("/public/academics/programs/" + slug)
                                .expect(200)
                                .node()
                                .get("content")
                                .get("title")
                                .asText())
                .startsWith("Nội dung");
        editor.mutate(
                        "POST",
                        "/admin/academics/programs/" + p.get("id").asText() + "/retire",
                        Map.of("reason", "Ngừng công khai chương trình"),
                        version(p))
                .expect(422);
    }

    @Test
    void admissionOperationsPreserveDraftAndProtectProgramLifecycle() throws Exception {
        var editor = account("EDITOR");
        var reader = new Client();
        String slug = "admit-" + UUID.randomUUID();
        var p = publishedProgram(editor, "prog-" + UUID.randomUUID());
        var a = academicPublish(editor, "admissions", admissionDraft(editor, p, slug));
        String path = "/admin/academics/admissions/" + a.get("id").asText();
        var d = academicDraft(a, slug);
        d.put("title", "Bản nháp riêng không được rò rỉ");
        a = academicSave(editor, "admissions", a, d);
        String deadline = Instant.now().plusSeconds(7200).toString();
        a =
                editor.mutate(
                                "POST",
                                path + "/extend",
                                Map.of(
                                        "deadline",
                                        deadline,
                                        "reason",
                                        "Bổ sung thời gian nộp hồ sơ"),
                                version(a))
                        .expect(200)
                        .node();
        assertThat(a.get("content").get("title").asText()).startsWith("Bản nháp");
        var live = reader.get("/public/academics/admissions/" + slug).expect(200).node();
        assertThat(live.get("content").get("title").asText()).startsWith("Quản lý");
        assertThat(live.get("status").asText()).isEqualTo("OPEN");
        assertThat(live.get("deadlineChanges").size()).isOne();
        assertThat(
                        reader.get(
                                        "/public/academics/admissions?status=OPEN&program="
                                                + p.get("id").asText())
                                .expect(200)
                                .node()
                                .get("total")
                                .asLong())
                .isOne();
        a =
                editor.mutate(
                                "POST",
                                path + "/close",
                                Map.of("reason", "Đã đủ số lượng hồ sơ"),
                                version(a))
                        .expect(200)
                        .node();
        assertThat(
                        reader.get("/public/academics/admissions/" + slug)
                                .expect(200)
                                .node()
                                .get("status")
                                .asText())
                .isEqualTo("CLOSED_EARLY");
        assertThat(editor.get(path + "/preview").expect(200).node().get("status").asText())
                .isEqualTo("CLOSED_EARLY");
        editor.mutate(
                        "POST",
                        path + "/extend",
                        Map.of(
                                "deadline",
                                Instant.now().plusSeconds(10000).toString(),
                                "reason",
                                "Thử mở lại tuyển sinh"),
                        version(a))
                .expect(422);
        p =
                editor.mutate(
                                "POST",
                                "/admin/academics/programs/" + p.get("id").asText() + "/retire",
                                Map.of("reason", "Ngừng nhận tuyển mới"),
                                version(p))
                        .expect(200)
                        .node();
        assertThat(
                        reader.get("/public/academics/admissions/" + slug)
                                .expect(200)
                                .node()
                                .get("programs")
                                .get(0)
                                .get("slug")
                                .isNull())
                .isTrue();
        editor.mutate(
                        "POST",
                        path + "/withdraw",
                        Map.of("reason", "Gỡ thông báo đã kết thúc"),
                        version(a))
                .expect(200);
        reader.get("/public/academics/admissions/" + slug).expect(404);
        assertThat(
                        jdbc.queryForObject(
                                "select details->>'reason' from platform.audit_event where"
                                        + " resource_id=? and action='ADMISSION_WITHDRAWN'",
                                String.class,
                                UUID.fromString(a.get("id").asText())))
                .isEqualTo("Gỡ thông báo đã kết thúc");
    }

    @Test
    void programRetireAndAdmissionPublishAreSerialized() throws Exception {
        var editor = account("EDITOR");
        var other = account("EDITOR");
        var p = publishedProgram(editor, "race-p-" + UUID.randomUUID());
        var a = admissionDraft(editor, p, "race-a-" + UUID.randomUUID());
        var start = new java.util.concurrent.CountDownLatch(1);
        var first =
                java.util.concurrent.CompletableFuture.supplyAsync(
                        () -> {
                            try {
                                start.await();
                                return editor.mutate(
                                                "POST",
                                                "/admin/academics/programs/"
                                                        + p.get("id").asText()
                                                        + "/retire",
                                                Map.of("reason", "Ngừng chương trình kiểm thử"),
                                                version(p))
                                        .status;
                            } catch (Exception e) {
                                throw new RuntimeException(e);
                            }
                        });
        var second =
                java.util.concurrent.CompletableFuture.supplyAsync(
                        () -> {
                            try {
                                start.await();
                                return other.mutate(
                                                "POST",
                                                "/admin/academics/admissions/"
                                                        + a.get("id").asText()
                                                        + "/publish",
                                                Map.of(
                                                        "draftVersion",
                                                        a.get("draftVersion").asLong()),
                                                version(a))
                                        .status;
                            } catch (Exception e) {
                                throw new RuntimeException(e);
                            }
                        });
        start.countDown();
        assertThat(List.of(first.get(), second.get())).containsExactlyInAnyOrder(200, 422);
        var current =
                editor.get("/admin/academics/programs/" + p.get("id").asText()).expect(200).node();
        var campaign =
                editor.get("/admin/academics/admissions/" + a.get("id").asText())
                        .expect(200)
                        .node();
        assertThat(
                        current.get("status").asText().equals("RETIRED")
                                && campaign.get("status").asText().equals("PUBLISHED"))
                .isFalse();
    }

    @Test
    void siteResolvesAcademicReferencesAndOnlyIncludesOpenAdmissions() throws Exception {
        var admin = account("ADMIN");
        var reader = new Client();
        var p = publishedProgram(admin, "site-program-" + UUID.randomUUID());
        var a =
                academicPublish(
                        admin,
                        "admissions",
                        admissionDraft(admin, p, "site-admission-" + UUID.randomUUID()));
        var home = admin.get("/admin/site/home").expect(200).node();
        var originalContent =
                new HashMap<String, Object>(json.convertValue(home.get("content"), Map.class));
        var content = new HashMap<String, Object>(originalContent);
        content.put("sections", List.of("PROGRAMS", "ADMISSIONS"));
        content.put(
                "programs",
                List.of(
                        Map.of(
                                "id",
                                UUID.randomUUID(),
                                "kicker",
                                "Đào tạo",
                                "title",
                                "",
                                "body",
                                "",
                                "action",
                                Map.of(
                                        "label",
                                        "Xem chương trình",
                                        "link",
                                        Map.of(
                                                "kind",
                                                "PROGRAM",
                                                "target",
                                                p.get("id").asText())))));
        content.put(
                "programsAction",
                Map.of(
                        "label",
                        "Tất cả chương trình",
                        "link",
                        Map.of("kind", "PROGRAMS", "target", "")));
        home = admin.mutate("PATCH", "/admin/site/home", content, version(home)).expect(200).node();
        admin.mutate(
                        "POST",
                        "/admin/site/home/publish",
                        Map.of("draftVersion", home.get("draftVersion").asLong()),
                        version(home))
                .expect(200);
        var publicHome = reader.get("/public/site/home").expect(200).node();
        assertThat(publicHome.get("education").get(p.get("id").asText()).get("title").asText())
                .isEqualTo(p.get("content").get("title").asText());
        assertThat(publicHome.get("admissions").toString()).contains(a.get("id").asText());
        var menu = admin.get("/admin/site/menu").expect(200).node();
        var menuDraft =
                Map.of(
                        "items",
                        List.of(
                                Map.of(
                                        "id",
                                        UUID.randomUUID(),
                                        "label",
                                        "Chương trình",
                                        "children",
                                        List.of(),
                                        "link",
                                        Map.of(
                                                "kind",
                                                "PROGRAM",
                                                "target",
                                                p.get("id").asText()))));
        menu =
                admin.mutate("PATCH", "/admin/site/menu", menuDraft, version(menu))
                        .expect(200)
                        .node();
        admin.mutate(
                        "POST",
                        "/admin/site/menu/publish",
                        Map.of("draftVersion", menu.get("draftVersion").asLong()),
                        version(menu))
                .expect(200);
        assertThat(reader.get("/public/site/menu").expect(200).node().get("urls").toString())
                .contains(p.get("content").get("slug").asText());
        a =
                admin.mutate(
                                "POST",
                                "/admin/academics/admissions/" + a.get("id").asText() + "/close",
                                Map.of("reason", "Đã kết thúc tuyển sinh"),
                                version(a))
                        .expect(200)
                        .node();
        assertThat(reader.get("/public/site/home").expect(200).node().get("admissions").toString())
                .doesNotContain(a.get("id").asText());
        admin.mutate(
                        "POST",
                        "/admin/academics/programs/" + p.get("id").asText() + "/retire",
                        Map.of("reason", "Chương trình ngừng hoạt động"),
                        version(p))
                .expect(200);
        assertThat(
                        reader.get("/public/site/menu")
                                .expect(200)
                                .node()
                                .get("content")
                                .get("items")
                                .size())
                .isZero();
        assertThat(
                        reader.get("/public/site/home")
                                .expect(200)
                                .node()
                                .get("education")
                                .has(p.get("id").asText()))
                .isFalse();
        // Keep shared Site fixtures independent of test order.
        content = originalContent;
        home = admin.get("/admin/site/home").expect(200).node();
        home = admin.mutate("PATCH", "/admin/site/home", content, version(home)).expect(200).node();
        admin.mutate(
                        "POST",
                        "/admin/site/home/publish",
                        Map.of("draftVersion", home.get("draftVersion").asLong()),
                        version(home))
                .expect(200);
    }

    @Test
    void academicSlugBoundaryAndNullPayloadAreHandledByTheApi() throws Exception {
        var editor = account("EDITOR");
        var reader = new Client();
        String slug = "academic-" + UUID.randomUUID().toString().replace("-", "") + "a".repeat(139);
        assertThat(slug.length()).isEqualTo(180);
        var p = academicCreate(editor, "programs", "UNDERGRADUATE");
        var valid = academicDraft(p, slug);
        valid.put("title", "Chương trình kiểm thử đường dẫn dài");
        p = academicPublish(editor, "programs", academicSave(editor, "programs", p, valid));
        assertThat(
                        reader.get("/public/academics/programs/" + slug)
                                .expect(200)
                                .node()
                                .get("id")
                                .asText())
                .isEqualTo(p.get("id").asText());
        var draft = academicDraft(p, slug + "b");
        // Keep the title within its separate limit while checking the slug boundary.
        draft.put("title", "Chương trình kiểm thử đường dẫn dài");
        editor.mutate(
                        "PATCH",
                        "/admin/academics/programs/" + p.get("id").asText(),
                        draft,
                        version(p))
                .expect(422);
        editor.mutate(
                        "PATCH",
                        "/admin/academics/programs/" + p.get("id").asText(),
                        null,
                        version(p))
                .expect(422);
    }

    @Test
    void fullArticleTablesImagesAndSourceDateSurviveDraftPublicationAndRestore() throws Exception {
        var editor = account("EDITOR");
        var reader = new Client();
        var asset = editor.upload(false).expect(201).node().get("id").asText();
        var entry = create(editor);
        var body = draft("Bài nhập toàn văn", "toan-van-" + UUID.randomUUID(), null);
        var text =
                Map.of(
                        "type",
                        "paragraph",
                        "content",
                        List.of(
                                Map.of(
                                        "type",
                                        "text",
                                        "text",
                                        "Nội dung nguyên bản trong bảng học thuật.")));
        var image =
                Map.of(
                        "type",
                        "image",
                        "attrs",
                        Map.of(
                                "assetId",
                                asset,
                                "alt",
                                "Ảnh nguồn",
                                "caption",
                                "Chú thích nguyên bản"));
        var cell =
                Map.of(
                        "type",
                        "tableCell",
                        "attrs",
                        Map.of("colspan", 2, "rowspan", 1),
                        "content",
                        List.of(text, image));
        var document =
                Map.of(
                        "type",
                        "doc",
                        "content",
                        List.of(
                                Map.of(
                                        "type",
                                        "table",
                                        "content",
                                        List.of(
                                                Map.of(
                                                        "type",
                                                        "tableRow",
                                                        "content",
                                                        List.of(cell))))));
        var origin =
                Map.of(
                        "url",
                        "https://lrd.ctu.edu.vn/bai-goc.html",
                        "publishedOn",
                        "2021-10-08",
                        "retrievedOn",
                        "2026-10-15",
                        "author",
                        "Tác giả gốc");
        body.put("document", document);
        body.put("origin", origin);
        entry = save(editor, entry, body);
        reader.get("/public/media/" + asset).expect(404);
        entry = publish(editor, entry, UUID.randomUUID().toString()).expect(200).node();
        var view = reader.get("/public/content/" + entry.get("id").asText()).expect(200).node();
        assertThat(view.get("document"))
                .isEqualTo(
                        json.valueToTree(
                                json.convertValue(
                                        document,
                                        vn.edu.ctu.lrd.publishing.domain.DocumentNode.class)));
        assertThat(view.get("origin")).isEqualTo(json.valueToTree(origin));
        reader.get("/public/media/" + asset).expect(200);
        var hits = reader.get("/public/content?q=" + body.get("slug")).expect(200).node();
        // The source date is indexed for chronology, independently of the real publication
        // timestamp.
        assertThat(
                        jdbc.queryForObject(
                                "select source_published_on::text from discovery.search_document"
                                        + " where source_id=?",
                                String.class,
                                UUID.fromString(entry.get("id").asText())))
                .isEqualTo("2021-10-08");
        assertThat(
                        Instant.parse(view.get("publishedAt").asText())
                                .isAfter(Instant.parse("2021-10-08T00:00:00Z")))
                .isTrue();
        var original =
                editor.get("/admin/content/" + entry.get("id").asText() + "/revisions")
                        .expect(200)
                        .node()
                        .get(0)
                        .get("id")
                        .asText();
        body.put(
                "origin",
                Map.of(
                        "url",
                        "https://lrd.ctu.edu.vn/moi.html",
                        "publishedOn",
                        "2026-10-15",
                        "retrievedOn",
                        "2026-10-15",
                        "author",
                        "Mới"));
        entry = save(editor, entry, body);
        assertThat(
                        reader.get("/public/content/" + entry.get("id").asText())
                                .expect(200)
                                .node()
                                .get("origin"))
                .isEqualTo(json.valueToTree(origin));
        entry =
                editor.mutate(
                                "POST",
                                "/admin/content/" + entry.get("id").asText() + "/restore-revision",
                                Map.of("revisionId", original),
                                version(entry))
                        .expect(200)
                        .node();
        assertThat(entry.get("document"))
                .isEqualTo(
                        json.valueToTree(
                                json.convertValue(
                                        document,
                                        vn.edu.ctu.lrd.publishing.domain.DocumentNode.class)));
        assertThat(entry.get("origin")).isEqualTo(json.valueToTree(origin));
    }

    @Test
    void mediaPaginationSearchAndOwnershipAreEnforced() throws Exception {
        var owner = account("AUTHOR");
        var other = account("AUTHOR");
        var first = owner.upload(false).expect(201).node().get("id").asText();
        var second = owner.upload(false).expect(201).node().get("id").asText();
        var foreign = other.upload(false).expect(201).node().get("id").asText();
        var page0 = owner.get("/admin/media?size=1&page=0&q=test").expect(200).node();
        var page1 = owner.get("/admin/media?size=1&page=1&q=test").expect(200).node();
        assertThat(Set.of(page0.get(0).get("id").asText(), page1.get(0).get("id").asText()))
                .containsExactlyInAnyOrder(first, second);
        assertThat(owner.get("/admin/media?size=1&page=2&q=test").expect(200).node().size())
                .isZero();
        assertThat(owner.get("/admin/media?q=not-present").expect(200).node().size()).isZero();
        owner.get("/admin/media?size=61").expect(422);
        owner.get("/admin/media?page=-1").expect(422);
        owner.get("/admin/media/" + foreign).expect(403);
        new Client().get("/admin/media?size=1&page=1").expect(401);
    }

    final class Client {
        UUID accountId;
        final HttpClient http =
                HttpClient.newBuilder()
                        .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                        .build();

        Reply get(String path) throws Exception {
            return send("GET", path, null, Map.of());
        }

        Reply mutate(String method, String path, Object data, Map<String, String> headers)
                throws Exception {
            var csrf = get("/auth/csrf").expect(200).node();
            var all = new HashMap<>(headers);
            all.put(csrf.get("headerName").asText(), csrf.get("token").asText());
            all.put("Content-Type", "application/json");
            return send(method, path, json.writeValueAsBytes(data), all);
        }

        Reply upload(boolean invalid) throws Exception {
            var csrf = get("/auth/csrf").expect(200).node();
            var bytes = new ByteArrayOutputStream();
            if (invalid) bytes.write("<script>bad upload</script>".getBytes());
            else ImageIO.write(new BufferedImage(80, 60, BufferedImage.TYPE_INT_RGB), "png", bytes);
            String boundary = "boundary-" + UUID.randomUUID();
            var body = new ByteArrayOutputStream();
            body.write(
                    ("--"
                                    + boundary
                                    + "\r\n"
                                    + "Content-Disposition: form-data; name=\"file\";"
                                    + " filename=\"test.png\"\r\n"
                                    + "Content-Type: image/png\r\n\r\n")
                            .getBytes());
            body.write(bytes.toByteArray());
            body.write(("\r\n--" + boundary + "--\r\n").getBytes());
            return send(
                    "POST",
                    "/admin/media",
                    body.toByteArray(),
                    Map.of(
                            "Content-Type",
                            "multipart/form-data; boundary=" + boundary,
                            csrf.get("headerName").asText(),
                            csrf.get("token").asText()));
        }

        Reply uploadSpreadsheet(String path, byte[] data, Map<String, String> fields) throws Exception {
            var csrf = get("/auth/csrf").expect(200).node();
            String boundary = "excel-" + UUID.randomUUID();
            var body = new ByteArrayOutputStream();
            for (var field : fields.entrySet()) {
                body.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\""
                        + field.getKey() + "\"\r\n\r\n" + field.getValue() + "\r\n").getBytes());
            }
            body.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\";"
                    + " filename=\"import.xlsx\"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n").getBytes());
            body.write(data);
            body.write(("\r\n--" + boundary + "--\r\n").getBytes());
            return send("POST", path, body.toByteArray(), Map.of("Content-Type", "multipart/form-data; boundary=" + boundary,
                    csrf.get("headerName").asText(), csrf.get("token").asText()));
        }

        Reply send(String method, String path, byte[] body, Map<String, String> headers)
                throws Exception {
            var request =
                    HttpRequest.newBuilder(
                                    URI.create("http://localhost:" + port + "/api/v1" + path))
                            .method(
                                    method,
                                    body == null
                                            ? HttpRequest.BodyPublishers.noBody()
                                            : HttpRequest.BodyPublishers.ofByteArray(body));
            headers.forEach(request::header);
            var response = http.send(request.build(), HttpResponse.BodyHandlers.ofByteArray());
            return new Reply(response.statusCode(), response.body());
        }
    }

    final class Reply {
        final int status;
        final byte[] bytes;

        Reply(int status, byte[] bytes) {
            this.status = status;
            this.bytes = bytes;
        }

        Reply expect(int expected) {
            assertThat(status)
                    .as(
                            "HTTP response: %s",
                            new String(bytes, java.nio.charset.StandardCharsets.UTF_8))
                    .isEqualTo(expected);
            return this;
        }

        JsonNode node() {
            return json.readTree(bytes);
        }
    }
}
