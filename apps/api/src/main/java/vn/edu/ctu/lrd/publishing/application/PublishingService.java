package vn.edu.ctu.lrd.publishing.application;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import vn.edu.ctu.lrd.publishing.application.port.*;
import vn.edu.ctu.lrd.publishing.domain.*;
import vn.edu.ctu.lrd.sharedkernel.CategoryCatalog;
import vn.edu.ctu.lrd.sharedkernel.Actor;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

public class PublishingService {
    private final ContentRepository repository;
    private final PublicationEffects effects;
    private final Clock clock;
    private final CategoryCatalog categories;

    public record Page(List<ContentEntry> items, long total, int page, int size) {}

    public PublishingService(
            ContentRepository repository, PublicationEffects effects, Clock clock,
            CategoryCatalog categories) {
        this.repository = repository;
        this.effects = effects;
        this.clock = clock;
        this.categories = categories;
    }

    public ContentEntry create(Actor actor, String locale) {
        actor.require("content:create");
        var entry = repository.insert(ContentEntry.create(actor, locale, clock.instant()));
        effects.audit("CONTENT_CREATED", entry.id(), actor);
        return entry;
    }

    public ContentEntry get(Actor actor, UUID id) {
        var entry = repository.get(id);
        authorize(actor, entry, "update");
        return entry;
    }

    public ContentEntry publicEntry(UUID id) {
        var entry = repository.get(id);
        require(entry.live() != null, "NOT_FOUND", "Không tìm thấy bài viết.");
        return entry;
    }

    public Page list(Actor actor, int page, int size, String query, String category, String status) {
        actor.require("content:create");
        require(page >= 0 && size >= 1 && size <= 50, "INVALID_PAGE", "Phân trang không hợp lệ.");
        require(query != null && query.length() <= 200 && category != null && category.length() <= 40
                        && (category.isEmpty() || categories.exists(category))
                        && List.of("", "DRAFT", "PUBLISHED", "CHANGED").contains(status),
                "INVALID_FILTER", "Bộ lọc bài viết không hợp lệ.");
        var owner = actor.can("content:update:any") ? null : actor.id();
        return new Page(repository.list(owner, page, size, query.strip(), category, status),
                repository.count(owner, query.strip(), category, status), page, size);
    }

    public ContentEntry save(Actor actor, UUID id, long version, ContentDraft draft) {
        var entry = get(actor, id);
        require(categories.exists(draft.category()), "INVALID_CATEGORY", "Chuyên mục chưa tồn tại.");
        effects.requireAssets(draft.assetIds(), actor);
        entry.revise(version, draft, clock.instant());
        var saved = repository.save(entry);
        effects.syncDraftAssets(saved);
        return saved;
    }

    public ContentEntry publish(Actor actor, UUID id, long version, long draftVersion, String key) {
        var entry = repository.get(id);
        authorize(actor, entry, "publish");
        require(categories.exists(entry.draft().category()), "INVALID_CATEGORY", "Chuyên mục chưa tồn tại.");
        require(
                key != null && key.matches("[A-Za-z0-9-]{8,100}"),
                "INVALID_IDEMPOTENCY_KEY",
                "Thiếu mã giao dịch đăng bài.");
        if (repository.retry(actor.id(), key, id, draftVersion).isPresent()) return entry;
        var ready = effects.requireAssets(entry.draft().assetIds(), actor);
        var revision = entry.publish(version, draftVersion, ready, actor, clock.instant());
        var saved = repository.save(entry);
        effects.publish(saved, actor);
        repository.remember(actor.id(), key, revision);
        return saved;
    }

    public ContentEntry withdraw(Actor actor, UUID id, long version) {
        var entry = repository.get(id);
        authorize(actor, entry, "publish");
        entry.withdraw(version, clock.instant());
        var saved = repository.save(entry);
        effects.withdraw(saved, actor);
        return saved;
    }

    public List<Publication> revisions(Actor actor, UUID id) {
        get(actor, id);
        return repository.revisions(id);
    }

    public ContentEntry restore(Actor actor, UUID id, long version, UUID revisionId) {
        var entry = get(actor, id);
        var revision = repository.revision(id, revisionId);
        effects.requireAssets(revision.snapshot().assetIds(), actor);
        entry.restore(version, revision, clock.instant());
        var saved = repository.save(entry);
        effects.syncDraftAssets(saved);
        effects.audit("REVISION_RESTORED", id, actor);
        return saved;
    }

    private void authorize(Actor actor, ContentEntry entry, String action) {
        require(
                actor.can("content:" + action + ":any")
                        || (actor.can("content:" + action + ":own")
                                && entry.ownerId().equals(actor.id())),
                "FORBIDDEN",
                "Bạn không có quyền thao tác với bài viết này.");
    }
}
