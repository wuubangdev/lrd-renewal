package vn.edu.ctu.lrd.editorial.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import java.time.Instant;
import java.util.UUID;

public record EditorialItem(UUID id, EditorialKind kind, String locale, EditorialDetails draft,
        EditorialDetails live, long version, long draftVersion, Long publishedDraftVersion,
        Instant createdAt, Instant updatedAt, Instant publishedAt) {
    public EditorialItem {
        require(id != null && kind != null && ("vi".equals(locale) || "en".equals(locale))
                && draft != null && version >= 0 && draftVersion >= 1 && createdAt != null && updatedAt != null,
                "INVALID_EDITORIAL", "Hồ sơ nội dung không hợp lệ.");
        require(live == null || (publishedDraftVersion != null && publishedAt != null),
                "INVALID_EDITORIAL", "Phiên bản công khai không hợp lệ.");
    }
    public static EditorialItem create(EditorialKind kind, String locale, Instant at) {
        var id = UUID.randomUUID();
        var details = new EditorialDetails("", "noi-dung-" + id.toString().substring(0, 8),
                "", null, "", "", null, null, null, "", "", null, "", "");
        return new EditorialItem(id, kind, locale, details, null, 0, 1, null, at, at, null);
    }
    public EditorialItem revise(long expected, EditorialDetails next, Instant at) {
        require(version == expected, "STALE_VERSION", "Hồ sơ đã được sửa ở nơi khác.");
        return new EditorialItem(id, kind, locale, next, live, version + 1, draftVersion + 1,
                publishedDraftVersion, createdAt, at, publishedAt);
    }
    public EditorialItem publish(long expected, long expectedDraft, Instant at) {
        require(version == expected && draftVersion == expectedDraft, "STALE_VERSION", "Bản nháp đã thay đổi.");
        draft.requirePublishable();
        return new EditorialItem(id, kind, locale, draft, draft, version + 1, draftVersion,
                draftVersion, createdAt, at, at);
    }
    public EditorialItem withdraw(long expected, Instant at) {
        require(version == expected, "STALE_VERSION", "Hồ sơ đã được sửa ở nơi khác.");
        return new EditorialItem(id, kind, locale, draft, null, version + 1, draftVersion,
                null, createdAt, at, null);
    }
}
