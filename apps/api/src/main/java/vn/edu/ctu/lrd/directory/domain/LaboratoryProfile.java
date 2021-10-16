package vn.edu.ctu.lrd.directory.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record LaboratoryProfile(UUID id, String locale, LaboratoryDetails draft, LaboratoryDetails live,
        long version, long draftVersion, Long publishedDraftVersion,
        Instant createdAt, Instant updatedAt, Instant publishedAt) {
    public LaboratoryProfile {
        require(id != null && ("vi".equals(locale) || "en".equals(locale)) && draft != null
                && version >= 0 && draftVersion >= 1 && createdAt != null && updatedAt != null,
                "INVALID_LAB", "Hồ sơ phòng thí nghiệm không hợp lệ.");
        require(live == null || (publishedDraftVersion != null && publishedAt != null),
                "INVALID_LAB", "Phiên bản công khai không hợp lệ.");
    }
    public static LaboratoryProfile create(String locale, Instant at) {
        var id = UUID.randomUUID();
        var details = new LaboratoryDetails("", "phong-thi-nghiem-" + id.toString().substring(0, 8),
                "", "", "", "", "", "", null, "", "EDITORIAL", List.of(), null);
        return new LaboratoryProfile(id, locale, details, null, 0, 1, null, at, at, null);
    }
    public LaboratoryProfile revise(long expected, LaboratoryDetails next, Instant at) {
        require(version == expected, "STALE_VERSION", "Hồ sơ đã được sửa ở nơi khác.");
        return new LaboratoryProfile(id, locale, next, live, version + 1, draftVersion + 1,
                publishedDraftVersion, createdAt, at, publishedAt);
    }
    public LaboratoryProfile publish(long expected, long expectedDraft, Instant at) {
        require(version == expected && draftVersion == expectedDraft, "STALE_VERSION", "Bản nháp đã thay đổi.");
        draft.requirePublishable();
        return new LaboratoryProfile(id, locale, draft, draft, version + 1, draftVersion,
                draftVersion, createdAt, at, at);
    }
    public LaboratoryProfile withdraw(long expected, Instant at) {
        require(version == expected, "STALE_VERSION", "Hồ sơ đã được sửa ở nơi khác.");
        return new LaboratoryProfile(id, locale, draft, null, version + 1, draftVersion,
                null, createdAt, at, null);
    }
}
