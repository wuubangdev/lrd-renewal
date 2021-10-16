package vn.edu.ctu.lrd.editorial.application;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import vn.edu.ctu.lrd.editorial.application.port.EditorialRepository;
import vn.edu.ctu.lrd.editorial.domain.*;
import vn.edu.ctu.lrd.discovery.api.SearchCatalog;
import vn.edu.ctu.lrd.media.api.MediaCatalog;
import vn.edu.ctu.lrd.platform.api.AuditLog;
import vn.edu.ctu.lrd.sharedkernel.*;
import java.time.Clock;
import java.util.*;

public final class EditorialService {
    private final EditorialRepository repository;
    private final SearchCatalog search;
    private final MediaCatalog media;
    private final AuditLog audit;
    private final Clock clock;
    public EditorialService(EditorialRepository repository, SearchCatalog search, MediaCatalog media,
            AuditLog audit, Clock clock) {
        this.repository = repository; this.search = search; this.media = media; this.audit = audit; this.clock = clock;
    }
    public EditorialItem create(Actor actor, EditorialKind kind, String locale) {
        actor.require("editorial:manage");
        var item = EditorialItem.create(kind, locale, clock.instant());
        repository.insert(item); audit.record(actor.id(), "EDITORIAL_CREATED", item.id());
        return item;
    }
    public EditorialItem get(Actor actor, UUID id) {
        actor.require("editorial:manage"); return repository.get(id);
    }
    public List<EditorialItem> list(Actor actor, EditorialKind kind, String locale) {
        actor.require("editorial:manage"); return repository.list(kind, locale, false);
    }
    public List<EditorialItem> publicList(EditorialKind kind, String locale) {
        return withPublishedArticles(repository.list(kind, locale, true), locale);
    }
    public EditorialItem publicOne(EditorialKind kind, String locale, String slug) {
        var item = repository.published(kind, locale, slug).orElseThrow(() ->
                new DomainException("NOT_FOUND", "Không tìm thấy nội dung."));
        require(!withPublishedArticles(List.of(item), locale).isEmpty(), "NOT_FOUND", "Bài viết liên kết chưa công khai.");
        return item;
    }
    private List<EditorialItem> withPublishedArticles(List<EditorialItem> items, String locale) {
        var ids = new HashSet<UUID>();
        for (var item : items) if (item.live() != null && item.live().articleId() != null) ids.add(item.live().articleId());
        if (ids.isEmpty()) return List.of();
        var published = new HashSet<UUID>();
        for (var article : search.findPublished(locale, ids)) published.add(article.id());
        return items.stream().filter(i -> i.live() != null && published.contains(i.live().articleId())).toList();
    }
    public EditorialItem save(Actor actor, UUID id, long version, EditorialDetails details) {
        actor.require("editorial:manage");
        var before = repository.get(id);
        require(!repository.slugTaken(before.kind(), before.locale(), details.slug(), id),
                "SLUG_CONFLICT", "Đường dẫn đã tồn tại.");
        require(details.articleId() == null || !repository.articleTaken(details.articleId(), id),
                "ARTICLE_CONFLICT", "Bài viết đã liên kết với hồ sơ khác.");
        media.requireUsable(assetIds(details), actor);
        var next = before.revise(version, details, clock.instant());
        repository.save(next, before.version());
        media.replaceUsage(id, assetIds(next.draft()), false);
        audit.record(actor.id(), "EDITORIAL_DRAFT_SAVED", id);
        return next;
    }
    public EditorialItem publish(Actor actor, UUID id, long version, long draftVersion) {
        actor.require("editorial:manage");
        var before = repository.get(id);
        before.draft().requirePublishable();
        var linked = search.findPublished(before.locale(), Set.of(before.draft().articleId()));
        require(linked.size() == 1, "ARTICLE_NOT_PUBLIC", "Bài viết liên kết phải được đăng công khai cùng ngôn ngữ.");
        media.requireUsable(assetIds(before.draft()), actor);
        var next = before.publish(version, draftVersion, clock.instant());
        repository.save(next, before.version());
        media.replaceUsage(id, assetIds(next.live()), true);
        audit.record(actor.id(), "EDITORIAL_PUBLISHED", id);
        return next;
    }
    public EditorialItem withdraw(Actor actor, UUID id, long version) {
        actor.require("editorial:manage");
        var before = repository.get(id);
        var next = before.withdraw(version, clock.instant());
        repository.save(next, before.version());
        media.replaceUsage(id, Set.of(), true);
        audit.record(actor.id(), "EDITORIAL_WITHDRAWN", id);
        return next;
    }
    private Set<UUID> assetIds(EditorialDetails details) {
        return details.thumbnailId() == null ? Set.of() : Set.of(details.thumbnailId());
    }
}
