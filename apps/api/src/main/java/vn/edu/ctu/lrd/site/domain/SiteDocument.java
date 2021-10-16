package vn.edu.ctu.lrd.site.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import java.time.Instant;
import java.util.UUID;

public record SiteDocument(
        UUID id,
        Kind kind,
        String locale,
        SiteContent draft,
        long draftVersion,
        long version,
        Release live,
        Instant updatedAt) {
    public enum Kind {
        HOME,
        MENU
    }

    public record Release(
            UUID id,
            UUID documentId,
            long draftVersion,
            SiteContent snapshot,
            Instant publishedAt,
            UUID publishedBy) {}

    public SiteDocument {
        require(
                id != null
                        && kind != null
                        && ("vi".equals(locale) || "en".equals(locale))
                        && draft != null,
                "INVALID_SITE",
                "Tài liệu website không hợp lệ.");
        require(
                kind == Kind.HOME
                        ? draft instanceof HomeComposition
                        : draft instanceof NavigationMenu,
                "INVALID_SITE",
                "Cấu trúc tài liệu không đúng loại.");
    }

    public SiteDocument revise(SiteContent content, long expected, Instant now) {
        expect(expected);
        return new SiteDocument(
                id, kind, locale, content, draftVersion + 1, version + 1, live, now);
    }

    public SiteDocument publish(long expected, long expectedDraft, UUID actor, Instant now) {
        expect(expected);
        require(
                draftVersion == expectedDraft,
                "STALE_VERSION",
                "Bản nháp đã thay đổi. Hãy tải lại.");
        draft.validateForPublication();
        if (live != null && live.draftVersion() == draftVersion) return this;
        var release = new Release(UUID.randomUUID(), id, draftVersion, draft, now, actor);
        return new SiteDocument(id, kind, locale, draft, draftVersion, version + 1, release, now);
    }

    public SiteDocument restore(Release release, long expected, Instant now) {
        require(release.documentId().equals(id), "NOT_FOUND", "Không tìm thấy phiên bản.");
        return revise(release.snapshot(), expected, now);
    }

    public String status() {
        return live == null
                ? "DRAFT"
                : live.draftVersion() == draftVersion ? "PUBLISHED" : "CHANGED";
    }

    public void expect(long expected) {
        require(
                expected == version,
                "STALE_VERSION",
                "Trang đã thay đổi ở nơi khác. Hãy tải lại để tiếp tục.");
    }
}
