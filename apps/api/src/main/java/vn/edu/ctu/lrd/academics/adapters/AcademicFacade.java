package vn.edu.ctu.lrd.academics.adapters;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.ctu.lrd.academics.application.AcademicService;
import vn.edu.ctu.lrd.academics.application.port.*;
import vn.edu.ctu.lrd.academics.domain.*;
import vn.edu.ctu.lrd.discovery.api.EducationCatalog;
import vn.edu.ctu.lrd.sharedkernel.*;
import vn.edu.ctu.lrd.site.api.RouteCatalog;

import java.time.*;
import java.util.*;

@Service
@Transactional
public class AcademicFacade {
    public record View(
            UUID id,
            String code,
            String locale,
            EducationLevel level,
            long version,
            long draftVersion,
            String status,
            Object content,
            UUID liveEditionId,
            Instant publishedAt,
            Instant updatedAt,
            String admissionStatus,
            String retirementReason,
            String publicUrl) {}

    public record Page(List<View> items, long total, int page, int size) {}

    public record History(
            UUID id,
            Long draftVersion,
            Instant publishedAt,
            String action,
            String reason,
            Object content) {}

    public record ProgramView(
            UUID id,
            String code,
            String locale,
            EducationLevel level,
            ProgramDraft content,
            Instant publishedAt,
            Map<UUID, String> accreditations,
            EducationCatalog.Result admissions) {}

    public record ProgramLink(UUID id, String code, String title, String slug, Integer quota) {}

    public record AdmissionView(
            UUID id,
            String code,
            String locale,
            EducationLevel level,
            AdmissionDraft content,
            Instant publishedAt,
            String status,
            Instant asOf,
            Instant closedAt,
            String closureReason,
            List<ProgramLink> programs,
            List<DeadlineChange> deadlineChanges) {}

    public record DeadlineChange(Instant at, Instant deadline, String reason) {}

    private final AcademicRepository repository;
    private final AcademicService service;
    private final RouteCatalog routes;
    private final EducationCatalog education;
    private final Clock clock;

    public AcademicFacade(
            AcademicRepository repository,
            AcademicEffects effects,
            RouteCatalog routes,
            EducationCatalog education,
            Clock clock) {
        this.repository = repository;
        this.service = new AcademicService(repository, effects, clock);
        this.routes = routes;
        this.education = education;
        this.clock = clock;
    }

    public View create(Actor a, String kind, String code, String locale, EducationLevel level) {
        return kind.equals("programs")
                ? view(service.createProgram(a, code, locale, level))
                : view(service.createAdmission(a, code, locale, level));
    }

    @Transactional(readOnly = true)
    public View get(Actor a, String kind, UUID id) {
        return kind.equals("programs")
                ? view(service.program(a, id))
                : view(service.admission(a, id));
    }

    @Transactional(readOnly = true)
    public Page list(Actor a, String kind, String q, String locale, int page, int size) {
        a.require("academics:manage");
        require(
                page >= 0
                        && page <= 100000
                        && size >= 1
                        && size <= 50
                        && q.length() <= 200
                        && Set.of("", "vi", "en").contains(locale),
                "INVALID_QUERY",
                "Bộ lọc không hợp lệ.");
        List<View> items =
                kind.equals("programs")
                        ? repository.programs(q, locale, page, size).stream()
                                .map(this::view)
                                .toList()
                        : repository.admissions(q, locale, page, size).stream()
                                .map(this::view)
                                .toList();
        return new Page(
                items,
                repository.count(kind.equals("programs") ? "program" : "admission", q, locale),
                page,
                size);
    }

    public View reviseProgram(Actor a, UUID id, ProgramDraft d, long v) {
        return view(service.reviseProgram(a, id, d, v));
    }

    public View reviseAdmission(Actor a, UUID id, AdmissionDraft d, long v) {
        return view(service.reviseAdmission(a, id, d, v));
    }

    public View publish(Actor a, String kind, UUID id, long v, long dv) {
        return kind.equals("programs")
                ? view(service.publishProgram(a, id, v, dv))
                : view(service.publishAdmission(a, id, v, dv));
    }

    public View restore(Actor a, String kind, UUID id, long v, UUID edition) {
        return kind.equals("programs")
                ? view(service.restoreProgram(a, id, edition, v))
                : view(service.restoreAdmission(a, id, edition, v));
    }

    public View retire(Actor a, UUID id, long v, String reason) {
        return view(service.retireProgram(a, id, v, reason));
    }

    public View reinstate(Actor a, UUID id, long v) {
        return view(service.reinstateProgram(a, id, v));
    }

    public View extend(Actor a, UUID id, long v, Instant deadline, String reason) {
        return view(service.extend(a, id, v, deadline, reason));
    }

    public View close(Actor a, UUID id, long v, String reason) {
        return view(service.close(a, id, v, reason));
    }

    public View withdraw(Actor a, UUID id, long v, String reason) {
        return view(service.withdraw(a, id, v, reason));
    }

    @Transactional(readOnly = true)
    public List<History> history(Actor a, String kind, UUID id) {
        get(a, kind, id);
        return kind.equals("programs")
                ? repository.programHistory(id).stream()
                        .map(
                                e ->
                                        new History(
                                                e.id(),
                                                e.draftVersion(),
                                                e.publishedAt(),
                                                "PUBLISHED",
                                                "",
                                                e.snapshot()))
                        .toList()
                : repository.admissionHistory(id).stream()
                        .map(
                                e ->
                                        new History(
                                                e.id(),
                                                e.draftVersion(),
                                                e.publishedAt(),
                                                e.action(),
                                                e.reason(),
                                                e.snapshot()))
                        .toList();
    }

    @Transactional(readOnly = true)
    public Object preview(Actor a, String kind, UUID id) {
        if (kind.equals("programs")) {
            var p = service.program(a, id);
            return programView(p, p.draft(), null);
        }
        var p = service.admission(a, id);
        var snapshots =
                p.draft().programs().stream()
                        .map(
                                c ->
                                        repository
                                                .program(c.programId())
                                                .map(
                                                        pr ->
                                                                new AdmissionCampaign
                                                                        .ProgramSnapshot(
                                                                        pr.id(),
                                                                        pr.code(),
                                                                        pr.draft().title(),
                                                                        pr.level()))
                                                .orElseThrow())
                        .toList();
        return admissionView(
                p,
                p.draft(),
                snapshots,
                null,
                p.live() == null ? null : p.live().closedAt(),
                p.live() == null ? "" : p.live().closureReason());
    }

    @Transactional(readOnly = true)
    public ProgramView publicProgram(String locale, String slug) {
        var p =
                repository
                        .program(routes.resolve(locale, "programs", slug))
                        .filter(v -> v.live() != null && !v.retired())
                        .orElseThrow(
                                () ->
                                        new DomainException(
                                                "NOT_FOUND", "Chương trình chưa công khai."));
        return programView(p, p.live().snapshot(), p.live().publishedAt());
    }

    @Transactional(readOnly = true)
    public AdmissionView publicAdmission(String locale, String slug) {
        var p =
                repository
                        .admission(routes.resolve(locale, "admissions", slug))
                        .filter(v -> v.live() != null)
                        .orElseThrow(
                                () ->
                                        new DomainException(
                                                "NOT_FOUND", "Đợt tuyển chưa công khai."));
        var e = p.live();
        return admissionView(
                p, e.snapshot(), e.programs(), e.publishedAt(), e.closedAt(), e.closureReason());
    }

    private ProgramView programView(AcademicProgram p, ProgramDraft d, Instant at) {
        var states = new LinkedHashMap<UUID, String>();
        var today = clock.instant().atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate();
        d.accreditations().forEach(c -> states.put(c.id(), c.validityAt(today).name()));
        return new ProgramView(
                p.id(),
                p.code(),
                p.locale(),
                p.level(),
                d,
                at,
                states,
                education.search(
                        p.locale(), "ADMISSION", "", "", "", null, p.id(), 0, 50, clock.instant()));
    }

    private AdmissionView admissionView(
            AdmissionCampaign p,
            AdmissionDraft d,
            List<AdmissionCampaign.ProgramSnapshot> snapshots,
            Instant at,
            Instant closed,
            String why) {
        var now = clock.instant();
        var links =
                snapshots.stream()
                        .map(
                                s -> {
                                    var current =
                                            repository
                                                    .program(s.id())
                                                    .filter(
                                                            pr ->
                                                                    pr.live() != null
                                                                            && !pr.retired());
                                    Integer quota =
                                            d.programs().stream()
                                                    .filter(c -> c.programId().equals(s.id()))
                                                    .map(AdmissionDraft.Choice::quota)
                                                    .filter(Objects::nonNull)
                                                    .findFirst()
                                                    .orElse(null);
                                    return new ProgramLink(
                                            s.id(),
                                            s.code(),
                                            current.map(pr -> pr.live().snapshot().title())
                                                    .orElse(s.title()),
                                            current.map(pr -> pr.live().snapshot().slug())
                                                    .orElse(null),
                                            quota);
                                })
                        .toList();
        String status = AdmissionCampaign.statusAt(d, closed, now).name();
        // History before the current live edition only. Draft work and a withdrawn period are not
        // public.
        var changes =
                at == null
                        ? List.<DeadlineChange>of()
                        : repository.admissionHistory(p.id()).stream()
                                .filter(
                                        e ->
                                                e.action().equals("DEADLINE_EXTENDED")
                                                        && !e.publishedAt().isAfter(at)
                                                        && Objects.equals(
                                                                e.snapshot().opensAt(), d.opensAt())
                                                        && e.snapshot().year() == d.year())
                                .map(
                                        e ->
                                                new DeadlineChange(
                                                        e.publishedAt(),
                                                        e.snapshot().closesAt(),
                                                        e.reason()))
                                .toList();
        return new AdmissionView(
                p.id(),
                p.code(),
                p.locale(),
                p.level(),
                d,
                at,
                status,
                now,
                closed,
                why,
                links,
                changes);
    }

    private View view(AcademicProgram p) {
        return new View(
                p.id(),
                p.code(),
                p.locale(),
                p.level(),
                p.version(),
                p.draftVersion(),
                p.status(),
                p.draft(),
                p.live() == null ? null : p.live().id(),
                p.live() == null ? null : p.live().publishedAt(),
                p.updatedAt(),
                null,
                p.retirementReason(),
                p.live() == null
                        ? null
                        : "/" + p.locale() + "/dao-tao/" + p.live().snapshot().slug());
    }

    private View view(AdmissionCampaign p) {
        return new View(
                p.id(),
                p.code(),
                p.locale(),
                p.level(),
                p.version(),
                p.draftVersion(),
                p.publicationStatus(),
                p.draft(),
                p.live() == null ? null : p.live().id(),
                p.live() == null ? null : p.live().publishedAt(),
                p.updatedAt(),
                p.live() == null ? null : p.live().statusAt(clock.instant()).name(),
                "",
                p.live() == null
                        ? null
                        : "/" + p.locale() + "/tuyen-sinh/" + p.live().snapshot().slug());
    }
}
