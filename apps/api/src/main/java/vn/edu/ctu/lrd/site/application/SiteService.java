package vn.edu.ctu.lrd.site.application;

import vn.edu.ctu.lrd.sharedkernel.*;
import vn.edu.ctu.lrd.site.application.port.*;
import vn.edu.ctu.lrd.site.domain.*;

import java.time.Clock;
import java.util.*;

public final class SiteService {
    private final SiteRepository repository;
    private final SiteEffects effects;
    private final Clock clock;

    public SiteService(SiteRepository repository, SiteEffects effects, Clock clock) {
        this.repository = repository;
        this.effects = effects;
        this.clock = clock;
    }

    public SiteDocument get(Actor actor, SiteDocument.Kind kind, String locale) {
        actor.require("site:manage");
        return repository
                .find(kind, locale)
                .orElseThrow(() -> new DomainException("NOT_FOUND", "Không tìm thấy trang."));
    }

    public SiteDocument revise(
            Actor actor, SiteDocument.Kind kind, String locale, SiteContent content, long version) {
        var before = get(actor, kind, locale);
        var after = before.revise(content, version, clock.instant());
        effects.trackDraft(after, actor);
        repository.save(after, before.version());
        effects.audit(actor, "SITE_DRAFT_SAVED", after.id());
        return after;
    }

    public SiteDocument publish(
            Actor actor, SiteDocument.Kind kind, String locale, long version, long draftVersion) {
        var before = get(actor, kind, locale);
        var after = before.publish(version, draftVersion, actor.id(), clock.instant());
        effects.validateReferences(after, actor);
        if (after == before) return before;
        repository.save(after, before.version());
        effects.trackPublication(after);
        effects.audit(actor, "SITE_PUBLISHED", after.id());
        return after;
    }

    public List<SiteDocument.Release> history(Actor actor, SiteDocument.Kind kind, String locale) {
        return repository.history(get(actor, kind, locale).id());
    }

    public SiteDocument restore(
            Actor actor, SiteDocument.Kind kind, String locale, UUID releaseId, long version) {
        var before = get(actor, kind, locale);
        var release =
                repository
                        .release(before.id(), releaseId)
                        .orElseThrow(
                                () ->
                                        new DomainException(
                                                "NOT_FOUND", "Không tìm thấy phiên bản."));
        var after = before.restore(release, version, clock.instant());
        effects.trackDraft(after, actor);
        repository.save(after, before.version());
        effects.audit(actor, "SITE_DRAFT_RESTORED", after.id());
        return after;
    }
}
