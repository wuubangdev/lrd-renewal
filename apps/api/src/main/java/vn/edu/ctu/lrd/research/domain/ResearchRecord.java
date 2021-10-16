package vn.edu.ctu.lrd.research.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import java.time.Instant;
import java.util.UUID;

public record ResearchRecord(UUID id, ResearchKind kind, String locale, ResearchDetails draft,
        ResearchDetails live, long version, long draftVersion, Long publishedDraftVersion,
        Instant createdAt, Instant updatedAt, Instant publishedAt) {
    public ResearchRecord {
        require(id != null && kind != null && ("vi".equals(locale) || "en".equals(locale)) && draft != null
                && version >= 0 && draftVersion >= 1 && createdAt != null && updatedAt != null,
                "INVALID_RESEARCH", "Bản ghi nghiên cứu không hợp lệ.");
        require(live == null || publishedDraftVersion != null && publishedAt != null,
                "INVALID_RESEARCH", "Phiên bản công khai không hợp lệ.");
    }
    public static ResearchRecord create(ResearchKind kind, String locale, Instant at) {
        var id = UUID.randomUUID();
        var details = new ResearchDetails("", "nghien-cuu-" + id.toString().substring(0, 8), "", null,
                "", "", "", "", "", "", "", "", "", "", "", "", null, "", java.util.List.of(), null, "");
        return new ResearchRecord(id, kind, locale, details, null, 0, 1, null, at, at, null);
    }
    public ResearchRecord revise(long expected, ResearchDetails details, Instant at) {
        require(version == expected, "STALE_VERSION", "Bản ghi đã được sửa ở nơi khác.");
        return new ResearchRecord(id, kind, locale, details, live, version + 1, draftVersion + 1,
                publishedDraftVersion, createdAt, at, publishedAt);
    }
    public ResearchRecord publish(long expected, long expectedDraft, Instant at) {
        require(version == expected && draftVersion == expectedDraft, "STALE_VERSION", "Bản nháp đã thay đổi.");
        draft.requirePublishable();
        return new ResearchRecord(id, kind, locale, draft, draft, version + 1, draftVersion,
                draftVersion, createdAt, at, at);
    }
    public ResearchRecord withdraw(long expected, Instant at) {
        require(version == expected, "STALE_VERSION", "Bản ghi đã được sửa ở nơi khác.");
        return new ResearchRecord(id, kind, locale, draft, null, version + 1, draftVersion,
                null, createdAt, at, null);
    }
}
