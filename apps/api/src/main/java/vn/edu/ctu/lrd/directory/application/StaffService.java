package vn.edu.ctu.lrd.directory.application;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import vn.edu.ctu.lrd.directory.application.port.StaffRepository;
import vn.edu.ctu.lrd.directory.domain.*;
import vn.edu.ctu.lrd.media.api.MediaCatalog;
import vn.edu.ctu.lrd.platform.api.AuditLog;
import vn.edu.ctu.lrd.sharedkernel.Actor;
import java.time.Clock;
import java.util.*;

public final class StaffService {
    private final StaffRepository repository;
    private final MediaCatalog media;
    private final AuditLog audit;
    private final Clock clock;
    public StaffService(StaffRepository repository, MediaCatalog media, AuditLog audit, Clock clock) {
        this.repository = repository; this.media = media; this.audit = audit; this.clock = clock;
    }
    public StaffProfile create(Actor actor, String locale) {
        actor.require("directory:manage");
        var profile = StaffProfile.create(locale, clock.instant());
        repository.insert(profile);
        audit.record(actor.id(), "STAFF_CREATED", profile.id());
        return profile;
    }
    public StaffProfile get(Actor actor, UUID id) {
        actor.require("directory:manage"); return repository.get(id);
    }
    public List<StaffProfile> list(Actor actor, String locale) {
        actor.require("directory:manage"); return repository.list(locale, false);
    }
    public List<StaffProfile> publicList(String locale) { return repository.list(locale, true); }
    public StaffProfile publicOne(String locale, String slug) {
        return repository.published(locale, slug).orElseThrow(() ->
                new vn.edu.ctu.lrd.sharedkernel.DomainException("NOT_FOUND", "Không tìm thấy cán bộ."));
    }
    public StaffProfile save(Actor actor, UUID id, long version, StaffDetails details) {
        actor.require("directory:manage");
        var before = repository.get(id);
        require(!repository.slugTaken(before.locale(), details.slug(), id), "SLUG_CONFLICT", "Đường dẫn hồ sơ đã tồn tại.");
        media.requireUsable(details.assetIds(), actor);
        var next = before.revise(version, details, clock.instant());
        repository.save(next, before.version());
        media.replaceUsage(id, next.draft().assetIds(), false);
        audit.record(actor.id(), "STAFF_DRAFT_SAVED", id);
        return next;
    }
    public StaffProfile publish(Actor actor, UUID id, long version, long draftVersion) {
        actor.require("directory:manage");
        var before = repository.get(id);
        media.requireUsable(before.draft().assetIds(), actor);
        var next = before.publish(version, draftVersion, clock.instant());
        repository.save(next, before.version());
        media.replaceUsage(id, next.live().assetIds(), true);
        audit.record(actor.id(), "STAFF_PUBLISHED", id);
        return next;
    }
    public StaffProfile withdraw(Actor actor, UUID id, long version) {
        actor.require("directory:manage");
        var before = repository.get(id);
        var next = before.withdraw(version, clock.instant());
        repository.save(next, before.version());
        media.replaceUsage(id, Set.of(), true);
        audit.record(actor.id(), "STAFF_WITHDRAWN", id);
        return next;
    }
}
