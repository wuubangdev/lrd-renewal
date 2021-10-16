package vn.edu.ctu.lrd.directory.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import java.time.Instant;
import java.util.UUID;

public record StaffProfile(UUID id, String locale, StaffDetails draft, StaffDetails live,
        long version, long draftVersion, Long publishedDraftVersion,
        Instant createdAt, Instant updatedAt, Instant publishedAt) {
    public StaffProfile {
        require(id != null && ("vi".equals(locale) || "en".equals(locale)) && draft != null
                        && version >= 0 && draftVersion >= 1 && createdAt != null && updatedAt != null,
                "INVALID_STAFF", "Hồ sơ cán bộ không hợp lệ.");
        require(live == null || (publishedDraftVersion != null && publishedAt != null),
                "INVALID_STAFF", "Phiên bản công khai không hợp lệ.");
    }
    public static StaffProfile create(String locale, Instant at) {
        var id = UUID.randomUUID();
        var details = new StaffDetails("", "can-bo-" + id.toString().substring(0, 8), "", "", "",
                "", "", "", "", "", "", java.util.List.of(), null, "", "EDITORIAL",
                java.util.List.of(), null, java.util.List.of(), "");
        return new StaffProfile(id, locale, details, null, 0, 1, null, at, at, null);
    }
    public StaffProfile revise(long expected, StaffDetails next, Instant at) {
        require(version == expected, "STALE_VERSION", "Hồ sơ đã được sửa ở nơi khác.");
        return new StaffProfile(id, locale, next, live, version + 1, draftVersion + 1,
                publishedDraftVersion, createdAt, at, publishedAt);
    }
    public StaffProfile publish(long expected, long expectedDraft, Instant at) {
        require(version == expected && draftVersion == expectedDraft, "STALE_VERSION", "Bản nháp hồ sơ đã thay đổi.");
        draft.requirePublishable();
        return new StaffProfile(id, locale, draft, draft.publicCopy(), version + 1, draftVersion,
                draftVersion, createdAt, at, at);
    }
    public StaffProfile withdraw(long expected, Instant at) {
        require(version == expected, "STALE_VERSION", "Hồ sơ đã được sửa ở nơi khác.");
        return new StaffProfile(id, locale, draft, null, version + 1, draftVersion,
                null, createdAt, at, null);
    }
    public String status() {
        return live == null ? "DRAFT" : draftVersion == publishedDraftVersion ? "PUBLISHED" : "CHANGED";
    }
}
