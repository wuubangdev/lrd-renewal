package vn.edu.ctu.lrd.directory.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import java.net.URI;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

public record StaffDetails(String name, String slug, String academicTitle, String degree,
        String position, String unit, String email, String phone, String office, String website,
        String summary, List<String> specialties, UUID portraitId, String portraitAlt,
        String template, List<StaffSection> sections, UUID sourceArticleId,
        List<StaffFact> privateFacts, String privateNotes, StaffAcademicInfo academic) {
    public StaffDetails {
        name = clean(name); slug = clean(slug); academicTitle = clean(academicTitle);
        degree = clean(degree); position = clean(position); unit = clean(unit);
        email = clean(email); phone = clean(phone); office = clean(office);
        website = clean(website); summary = clean(summary); portraitAlt = clean(portraitAlt);
        template = clean(template); privateNotes = clean(privateNotes);
        specialties = specialties == null ? List.of() : List.copyOf(specialties);
        sections = sections == null ? List.of() : List.copyOf(sections);
        academic = academic == null ? StaffLegacyMapper.convert(sections) : academic;
        privateFacts = privateFacts == null ? List.of() : List.copyOf(privateFacts);
        require(name.length() <= 160 && slug.matches("[a-z0-9]+(?:-[a-z0-9]+)*") && slug.length() <= 160,
                "INVALID_STAFF", "Tên hoặc đường dẫn hồ sơ không hợp lệ.");
        require(academicTitle.length() <= 100 && degree.length() <= 100 && position.length() <= 120
                        && unit.length() <= 160 && email.length() <= 160 && phone.length() <= 80
                        && office.length() <= 160 && website.length() <= 500 && summary.length() <= 1000
                        && portraitAlt.length() <= 300 && privateNotes.length() <= 20000,
                "INVALID_STAFF", "Một trường hồ sơ vượt giới hạn.");
        require(email.isEmpty() || email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"),
                "INVALID_STAFF", "Email công khai không hợp lệ.");
        if (!website.isEmpty()) {
            try { require("https".equalsIgnoreCase(URI.create(website).getScheme()),
                    "INVALID_STAFF", "Website cá nhân phải dùng HTTPS."); }
            catch (IllegalArgumentException ex) { require(false, "INVALID_STAFF", "Website cá nhân không hợp lệ."); }
        }
        require(Set.of("EDITORIAL", "ACADEMIC", "COMPACT", "PORTRAIT", "DOSSIER").contains(template),
                "INVALID_STAFF", "Mẫu hồ sơ không hợp lệ.");
        require(specialties.size() <= 30 && specialties.stream().allMatch(s -> s != null && s.length() <= 120)
                        && sections.size() <= 30 && privateFacts.size() <= 50,
                "INVALID_STAFF", "Hồ sơ có quá nhiều chuyên môn hoặc đề mục.");
    }

    public StaffDetails(String name, String slug, String academicTitle, String degree,
            String position, String unit, String email, String phone, String office, String website,
            String summary, List<String> specialties, UUID portraitId, String portraitAlt,
            String template, List<StaffSection> sections, UUID sourceArticleId,
            List<StaffFact> privateFacts, String privateNotes) {
        this(name, slug, academicTitle, degree, position, unit, email, phone, office, website,
                summary, specialties, portraitId, portraitAlt, template, sections, sourceArticleId,
                privateFacts, privateNotes, null);
    }

    private static String clean(String text) { return text == null ? "" : text.strip(); }

    public void requirePublishable() {
        require(name.length() >= 3, "STAFF_INCOMPLETE", "Vui lòng nhập họ tên cán bộ.");
        require(portraitId == null || !portraitAlt.isBlank(), "STAFF_INCOMPLETE", "Vui lòng mô tả ảnh chân dung.");
    }

    public Set<UUID> assetIds() {
        var ids = sections.stream().flatMap(s -> s.blocks().stream()).map(StaffBlock::assetId)
                .filter(java.util.Objects::nonNull).collect(Collectors.toSet());
        if (portraitId != null) ids.add(portraitId);
        return Set.copyOf(ids);
    }

    public StaffDetails publicCopy() {
        return new StaffDetails(name, slug, academicTitle, degree, position, unit, email, phone,
                office, website, summary, specialties, portraitId, portraitAlt, template, sections,
                sourceArticleId, List.of(), "", academic);
    }
}
