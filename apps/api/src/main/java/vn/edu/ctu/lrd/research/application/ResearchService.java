package vn.edu.ctu.lrd.research.application;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import vn.edu.ctu.lrd.research.application.port.ResearchRepository;
import vn.edu.ctu.lrd.research.domain.*;
import vn.edu.ctu.lrd.directory.api.DirectoryCatalog;
import vn.edu.ctu.lrd.media.api.MediaCatalog;
import vn.edu.ctu.lrd.platform.api.AuditLog;
import vn.edu.ctu.lrd.sharedkernel.*;
import java.time.Clock;
import java.util.*;

public final class ResearchService {
    private final ResearchRepository repository;
    private final DirectoryCatalog directory;
    private final MediaCatalog media;
    private final AuditLog audit;
    private final Clock clock;
    public ResearchService(ResearchRepository repository, DirectoryCatalog directory,
            MediaCatalog media, AuditLog audit, Clock clock) {
        this.repository = repository; this.directory = directory; this.media = media;
        this.audit = audit; this.clock = clock;
    }
    public ResearchRecord create(Actor actor, ResearchKind kind, String locale) {
        actor.require("research:manage");
        var record = ResearchRecord.create(kind, locale, clock.instant());
        repository.insert(record); audit.record(actor.id(), "RESEARCH_CREATED", record.id());
        return record;
    }
    public ResearchRecord get(Actor actor, UUID id) { actor.require("research:manage"); return repository.get(id); }
    public List<ResearchRecord> list(Actor actor, ResearchKind kind, String locale, int page, int size) {
        actor.require("research:manage"); return repository.list(kind, locale, false, page, size);
    }
    public long count(Actor actor, ResearchKind kind, String locale) {
        actor.require("research:manage"); return repository.count(kind, locale, false);
    }
    public List<ResearchRecord> publicList(ResearchKind kind, String locale, int page, int size) {
        return repository.list(kind, locale, true, page, size);
    }
    public long publicCount(ResearchKind kind, String locale) { return repository.count(kind, locale, true); }
    public List<ResearchRecord> byStaff(UUID staffId, String locale) { return repository.byStaff(staffId, locale); }
    public ResearchRecord publicOne(String locale, String slug) {
        return repository.published(locale, slug).orElseThrow(() ->
                new DomainException("NOT_FOUND", "Không tìm thấy công trình nghiên cứu."));
    }
    public ResearchRecord save(Actor actor, UUID id, long version, ResearchDetails details) {
        actor.require("research:manage");
        var before = repository.get(id);
        require(!repository.slugTaken(before.locale(), details.slug(), id), "SLUG_CONFLICT", "Đường dẫn đã tồn tại.");
        require(details.sourceKey().isBlank() || !repository.sourceTaken(details.sourceKey(), id),
                "SOURCE_CONFLICT", "Bản ghi nguồn đã được chuyển.");
        validateStaff(before.locale(), details);
        media.requireUsable(details.assetIds(), actor);
        var next = before.revise(version, details, clock.instant());
        repository.save(next, before.version());
        media.replaceUsage(id, next.draft().assetIds(), false);
        audit.record(actor.id(), "RESEARCH_DRAFT_SAVED", id);
        return next;
    }
    public ResearchRecord publish(Actor actor, UUID id, long version, long draftVersion) {
        actor.require("research:manage");
        var before = repository.get(id);
        validateStaff(before.locale(), before.draft());
        media.requireUsable(before.draft().assetIds(), actor);
        var next = before.publish(version, draftVersion, clock.instant());
        repository.save(next, before.version());
        media.replaceUsage(id, next.live().assetIds(), true);
        audit.record(actor.id(), "RESEARCH_PUBLISHED", id);
        return next;
    }
    public ResearchRecord withdraw(Actor actor, UUID id, long version) {
        actor.require("research:manage");
        var before = repository.get(id);
        var next = before.withdraw(version, clock.instant());
        repository.save(next, before.version());
        media.replaceUsage(id, Set.of(), true);
        audit.record(actor.id(), "RESEARCH_WITHDRAWN", id);
        return next;
    }
    private void validateStaff(String locale, ResearchDetails details) {
        for (var id : details.staffIds()) require(directory.publishedStaffSlug(locale, id).isPresent(),
                "STAFF_NOT_PUBLIC", "Cán bộ liên kết phải có hồ sơ công khai cùng ngôn ngữ.");
    }
}
