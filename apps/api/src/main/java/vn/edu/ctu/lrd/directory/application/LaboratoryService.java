package vn.edu.ctu.lrd.directory.application;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import vn.edu.ctu.lrd.directory.application.port.LaboratoryRepository;
import vn.edu.ctu.lrd.directory.domain.*;
import vn.edu.ctu.lrd.media.api.MediaCatalog;
import vn.edu.ctu.lrd.platform.api.AuditLog;
import vn.edu.ctu.lrd.sharedkernel.*;
import java.time.Clock;
import java.util.*;

public final class LaboratoryService {
    private final LaboratoryRepository repository;
    private final MediaCatalog media;
    private final AuditLog audit;
    private final Clock clock;
    public LaboratoryService(LaboratoryRepository repository, MediaCatalog media, AuditLog audit, Clock clock) {
        this.repository = repository; this.media = media; this.audit = audit; this.clock = clock;
    }
    public LaboratoryProfile create(Actor actor, String locale) {
        actor.require("directory:manage");
        var profile = LaboratoryProfile.create(locale, clock.instant());
        repository.insert(profile);
        audit.record(actor.id(), "LAB_CREATED", profile.id());
        return profile;
    }
    public LaboratoryProfile get(Actor actor, UUID id) {
        actor.require("directory:manage"); return repository.get(id);
    }
    public List<LaboratoryProfile> list(Actor actor, String locale) {
        actor.require("directory:manage"); return repository.list(locale, false);
    }
    public List<LaboratoryProfile> publicList(String locale) { return repository.list(locale, true); }
    public LaboratoryProfile publicOne(String locale, String slug) {
        return repository.published(locale, slug).orElseThrow(() ->
                new DomainException("NOT_FOUND", "Không tìm thấy phòng thí nghiệm."));
    }
    public LaboratoryProfile save(Actor actor, UUID id, long version, LaboratoryDetails details) {
        actor.require("directory:manage");
        var before = repository.get(id);
        require(!repository.slugTaken(before.locale(), details.slug(), id), "SLUG_CONFLICT", "Đường dẫn đã tồn tại.");
        media.requireUsable(details.assetIds(), actor);
        var next = before.revise(version, details, clock.instant());
        repository.save(next, before.version());
        media.replaceUsage(id, next.draft().assetIds(), false);
        audit.record(actor.id(), "LAB_DRAFT_SAVED", id);
        return next;
    }
    public LaboratoryProfile publish(Actor actor, UUID id, long version, long draftVersion) {
        actor.require("directory:manage");
        var before = repository.get(id);
        media.requireUsable(before.draft().assetIds(), actor);
        var next = before.publish(version, draftVersion, clock.instant());
        repository.save(next, before.version());
        media.replaceUsage(id, next.live().assetIds(), true);
        audit.record(actor.id(), "LAB_PUBLISHED", id);
        return next;
    }
    public LaboratoryProfile withdraw(Actor actor, UUID id, long version) {
        actor.require("directory:manage");
        var before = repository.get(id);
        var next = before.withdraw(version, clock.instant());
        repository.save(next, before.version());
        media.replaceUsage(id, Set.of(), true);
        audit.record(actor.id(), "LAB_WITHDRAWN", id);
        return next;
    }
}
