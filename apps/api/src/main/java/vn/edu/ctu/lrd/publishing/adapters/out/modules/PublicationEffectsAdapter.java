package vn.edu.ctu.lrd.publishing.adapters.out.modules;

import org.springframework.stereotype.Component;

import vn.edu.ctu.lrd.discovery.api.SearchCatalog;
import vn.edu.ctu.lrd.media.api.MediaCatalog;
import vn.edu.ctu.lrd.platform.api.AuditLog;
import vn.edu.ctu.lrd.publishing.application.port.PublicationEffects;
import vn.edu.ctu.lrd.publishing.domain.ContentEntry;
import vn.edu.ctu.lrd.sharedkernel.Actor;
import vn.edu.ctu.lrd.site.api.RouteCatalog;

import java.util.Set;
import java.util.UUID;

@Component
public class PublicationEffectsAdapter implements PublicationEffects {
    private final MediaCatalog media;
    private final RouteCatalog routes;
    private final SearchCatalog search;
    private final AuditLog audit;

    public PublicationEffectsAdapter(
            MediaCatalog media, RouteCatalog routes, SearchCatalog search, AuditLog audit) {
        this.media = media;
        this.routes = routes;
        this.search = search;
        this.audit = audit;
    }

    public Set<UUID> requireAssets(Set<UUID> ids, Actor actor) {
        return media.requireUsable(ids, actor);
    }

    public void syncDraftAssets(ContentEntry e) {
        media.replaceUsage(e.id(), e.draft().assetIds(), false);
    }

    public void publish(ContentEntry e, Actor actor) {
        var p = e.live();
        var d = p.snapshot();
        routes.publish(e.id(), e.locale(), d.slug());
        media.replaceUsage(e.id(), d.assetIds(), true);
        search.index(
                new SearchCatalog.Document(
                        e.id(),
                        e.locale(),
                        d.slug(),
                        d.title(),
                        d.summary(),
                        d.category(),
                        d.coverId(),
                        d.displayAuthor(p.authorName()),
                        d.document().plainText(),
                        p.publishedAt(),
                        d.origin() == null ? null : d.origin().publishedOn()));
        audit("CONTENT_PUBLISHED", e.id(), actor);
    }

    public void withdraw(ContentEntry e, Actor actor) {
        routes.withdraw(e.id());
        media.replaceUsage(e.id(), Set.of(), true);
        search.remove(e.id());
        audit("CONTENT_WITHDRAWN", e.id(), actor);
    }

    public void audit(String action, UUID id, Actor actor) {
        audit.record(actor.id(), action, id);
    }
}
