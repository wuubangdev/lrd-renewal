package vn.edu.ctu.lrd.publishing.adapters.in.web;

import vn.edu.ctu.lrd.publishing.domain.*;

import java.time.Instant;
import java.util.UUID;

public final class ContentViews {
    private ContentViews() {}

    public record AdminView(
            UUID id,
            UUID ownerId,
            String locale,
            long version,
            long draftVersion,
            String status,
            String title,
            String slug,
            String summary,
            String byline,
            String category,
            DocumentNode document,
            UUID coverId,
            String coverAlt,
            String publicUrl,
            Instant createdAt,
            Instant updatedAt,
            Instant publishedAt,
            ContentOrigin origin) {}

    public record PublicView(
            UUID id,
            String locale,
            String title,
            String slug,
            String summary,
            String byline,
            String category,
            DocumentNode document,
            UUID coverId,
            String coverAlt,
            String authorName,
            Instant publishedAt,
            String publicUrl,
            ContentOrigin origin) {}

    public record RevisionView(
            UUID id, long draftVersion, String title, Instant publishedAt, String authorName) {}

    public static AdminView admin(ContentEntry e) {
        var d = e.draft();
        return new AdminView(
                e.id(),
                e.ownerId(),
                e.locale(),
                e.version(),
                e.draftVersion(),
                e.status(),
                d.title(),
                d.slug(),
                d.summary(),
                d.byline(),
                d.category(),
                d.document().root(),
                d.coverId(),
                d.coverAlt(),
                e.live() == null ? null : url(e.locale(), e.live().snapshot().slug()),
                e.createdAt(),
                e.updatedAt(),
                e.live() == null ? null : e.live().publishedAt(),
                d.origin());
    }

    public static PublicView published(ContentEntry e) {
        var p = e.live();
        var d = p.snapshot();
        return new PublicView(
                e.id(),
                e.locale(),
                d.title(),
                d.slug(),
                d.summary(),
                d.displayAuthor(p.authorName()),
                d.category(),
                d.document().root(),
                d.coverId(),
                d.coverAlt(),
                p.authorName(),
                p.publishedAt(),
                url(e.locale(), d.slug()),
                d.origin());
    }

    public static RevisionView revision(Publication p) {
        return new RevisionView(
                p.id(), p.draftVersion(), p.snapshot().title(), p.publishedAt(), p.authorName());
    }

    private static String url(String locale, String slug) {
        return "/" + locale + "/tin-tuc/" + slug;
    }
}
