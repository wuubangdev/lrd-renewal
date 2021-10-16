package vn.edu.ctu.lrd.academics.adapters;

import org.springframework.stereotype.Component;

import vn.edu.ctu.lrd.academics.application.port.AcademicEffects;
import vn.edu.ctu.lrd.academics.domain.*;
import vn.edu.ctu.lrd.discovery.api.EducationCatalog;
import vn.edu.ctu.lrd.media.api.MediaCatalog;
import vn.edu.ctu.lrd.platform.api.AuditLog;
import vn.edu.ctu.lrd.sharedkernel.Actor;
import vn.edu.ctu.lrd.site.api.RouteCatalog;

import java.util.*;

@Component
public class AcademicEffectsAdapter implements AcademicEffects {
    private final MediaCatalog media;
    private final RouteCatalog routes;
    private final EducationCatalog search;
    private final AuditLog audit;

    public AcademicEffectsAdapter(
            MediaCatalog media, RouteCatalog routes, EducationCatalog search, AuditLog audit) {
        this.media = media;
        this.routes = routes;
        this.search = search;
        this.audit = audit;
    }

    public void validateAssets(Set<UUID> ids, Actor a) {
        media.requireUsable(ids, a);
    }

    private void remove(UUID id) {
        media.replaceUsage(id, Set.of(), true);
        routes.withdraw(id);
        search.remove(id);
    }

    public void synchronize(AcademicProgram p) {
        media.replaceUsage(p.id(), p.draft().assetIds(), false);
        if (p.live() == null) {
            remove(p.id());
            return;
        }
        var e = p.live();
        var d = e.snapshot();
        media.replaceUsage(p.id(), d.assetIds(), true);
        routes.publish(p.id(), p.locale(), "programs", d.slug());
        search.index(
                new EducationCatalog.Document(
                        p.id(),
                        "PROGRAM",
                        p.code(),
                        p.locale(),
                        p.level().name(),
                        d.slug(),
                        d.title(),
                        d.summary(),
                        d.coverId(),
                        null,
                        null,
                        null,
                        null,
                        List.of(),
                        e.publishedAt()));
    }

    public void synchronize(AdmissionCampaign p) {
        media.replaceUsage(p.id(), p.draft().assetIds(), false);
        if (p.live() == null) {
            remove(p.id());
            return;
        }
        var e = p.live();
        var d = e.snapshot();
        media.replaceUsage(p.id(), d.assetIds(), true);
        routes.publish(p.id(), p.locale(), "admissions", d.slug());
        search.index(
                new EducationCatalog.Document(
                        p.id(),
                        "ADMISSION",
                        p.code(),
                        p.locale(),
                        p.level().name(),
                        d.slug(),
                        d.title(),
                        d.summary(),
                        d.coverId(),
                        d.year(),
                        d.opensAt(),
                        d.closesAt(),
                        e.closedAt(),
                        d.programs().stream().map(AdmissionDraft.Choice::programId).toList(),
                        e.publishedAt()));
    }

    public void audit(Actor a, String action, UUID id, String reason) {
        audit.record(
                a.id(), action, id, reason.isBlank() ? Map.of() : Map.of("reason", reason.strip()));
    }
}
