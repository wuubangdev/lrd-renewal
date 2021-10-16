package vn.edu.ctu.lrd.directory.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

public record LaboratoryDetails(String name, String slug, String shortName, String lead,
        String location, String email, String phone, String summary, UUID coverId, String coverAlt,
        String template, List<StaffSection> sections, UUID sourceArticleId, LabContent content) {
    public LaboratoryDetails {
        name = clean(name); slug = clean(slug); shortName = clean(shortName); lead = clean(lead);
        location = clean(location); email = clean(email); phone = clean(phone);
        summary = clean(summary); coverAlt = clean(coverAlt); template = clean(template);
        sections = sections == null ? List.of() : List.copyOf(sections);
        content = content == null ? LabLegacyMapper.convert(sections) : content;
        require(name.length() <= 200 && slug.matches("[a-z0-9]+(?:-[a-z0-9]+)*") && slug.length() <= 160,
                "INVALID_LAB", "Tên hoặc đường dẫn phòng thí nghiệm không hợp lệ.");
        require(shortName.length() <= 120 && lead.length() <= 200 && location.length() <= 300
                && email.length() <= 160 && phone.length() <= 80 && summary.length() <= 1000
                && coverAlt.length() <= 300 && sections.size() <= 30,
                "INVALID_LAB", "Thông tin phòng thí nghiệm vượt giới hạn.");
        require(email.isBlank() || email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"),
                "INVALID_LAB", "Email liên hệ không hợp lệ.");
        require(Set.of("EDITORIAL", "ACADEMIC", "COMPACT", "PORTRAIT", "DOSSIER").contains(template),
                "INVALID_LAB", "Mẫu trình bày không hợp lệ.");
    }
    public LaboratoryDetails(String name, String slug, String shortName, String lead,
            String location, String email, String phone, String summary, UUID coverId, String coverAlt,
            String template, List<StaffSection> sections, UUID sourceArticleId) {
        this(name, slug, shortName, lead, location, email, phone, summary, coverId, coverAlt,
                template, sections, sourceArticleId, null);
    }
    private static String clean(String value) { return value == null ? "" : value.strip(); }
    public void requirePublishable() {
        require(name.length() >= 3 && !summary.isBlank(), "LAB_INCOMPLETE", "Nhập tên và giới thiệu phòng thí nghiệm.");
        require(coverId == null || !coverAlt.isBlank(), "LAB_INCOMPLETE", "Mô tả ảnh đại diện.");
    }
    public Set<UUID> assetIds() {
        var ids = sections.stream().flatMap(s -> s.blocks().stream()).map(StaffBlock::assetId)
                .filter(java.util.Objects::nonNull).collect(Collectors.toSet());
        if (coverId != null) ids.add(coverId);
        content.equipment().stream().map(LabEquipment::imageId).filter(java.util.Objects::nonNull).forEach(ids::add);
        return Set.copyOf(ids);
    }
}
