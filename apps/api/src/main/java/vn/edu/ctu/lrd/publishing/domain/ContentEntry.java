package vn.edu.ctu.lrd.publishing.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import vn.edu.ctu.lrd.sharedkernel.Actor;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

public final class ContentEntry {
    private final UUID id, ownerId;
    private final String locale;
    private final long version;
    private final Instant createdAt;
    private Instant updatedAt;
    private long draftVersion;
    private ContentDraft draft;
    private Publication live;

    public ContentEntry(
            UUID id,
            UUID ownerId,
            String locale,
            long version,
            long draftVersion,
            ContentDraft draft,
            Publication live,
            Instant createdAt,
            Instant updatedAt) {
        this.id = id;
        this.ownerId = ownerId;
        this.locale = locale;
        this.version = version;
        this.draftVersion = draftVersion;
        this.draft = draft;
        this.live = live;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static ContentEntry create(Actor actor, String locale, Instant now) {
        require(
                Set.of("vi", "en").contains(locale),
                "INVALID_LOCALE",
                "Ngôn ngữ không được hỗ trợ.");
        UUID id = UUID.randomUUID();
        var draft =
                new ContentDraft(
                        "",
                        "bai-viet-" + id.toString().substring(0, 8),
                        "",
                        "TIN_TUC",
                        new RichDocument(DocumentNode.empty()),
                        null,
                        "",
                        actor.name(),
                        null);
        return new ContentEntry(id, actor.id(), locale, 0, 1, draft, null, now, now);
    }

    public void revise(long expectedVersion, ContentDraft replacement, Instant now) {
        expectVersion(expectedVersion);
        if (!draft.equals(replacement)) {
            draft = replacement;
            draftVersion++;
            updatedAt = now;
        }
    }

    public Publication publish(
            long expectedVersion,
            long expectedDraft,
            Set<UUID> readyAssets,
            Actor actor,
            Instant now) {
        expectVersion(expectedVersion);
        require(
                draftVersion == expectedDraft,
                "STALE_VERSION",
                "Bản nháp đã thay đổi. Hãy lưu và thử đăng lại.");
        if (live != null && live.draftVersion() == draftVersion) return live;
        draft.validateForPublication(readyAssets);
        live =
                new Publication(
                        UUID.randomUUID(), id, draftVersion, draft, now, actor.id(), actor.name());
        updatedAt = now;
        return live;
    }

    public void withdraw(long expectedVersion, Instant now) {
        expectVersion(expectedVersion);
        live = null;
        updatedAt = now;
    }

    public void restore(long expectedVersion, Publication revision, Instant now) {
        expectVersion(expectedVersion);
        require(revision.entryId().equals(id), "NOT_FOUND", "Không tìm thấy phiên bản.");
        draft = revision.snapshot();
        draftVersion++;
        updatedAt = now;
    }

    public void expectVersion(long expected) {
        require(
                expected == version,
                "STALE_VERSION",
                "Bài viết đã được cập nhật ở nơi khác. Hãy tải phiên bản mới trước khi lưu.");
    }

    public String status() {
        return live == null
                ? "DRAFT"
                : live.draftVersion() == draftVersion ? "PUBLISHED" : "CHANGED";
    }

    public UUID id() {
        return id;
    }

    public UUID ownerId() {
        return ownerId;
    }

    public String locale() {
        return locale;
    }

    public long version() {
        return version;
    }

    public long draftVersion() {
        return draftVersion;
    }

    public ContentDraft draft() {
        return draft;
    }

    public Publication live() {
        return live;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant updatedAt() {
        return updatedAt;
    }
}
