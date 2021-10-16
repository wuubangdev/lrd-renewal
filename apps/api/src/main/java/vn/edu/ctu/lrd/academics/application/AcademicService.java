package vn.edu.ctu.lrd.academics.application;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import vn.edu.ctu.lrd.academics.application.port.*;
import vn.edu.ctu.lrd.academics.domain.*;
import vn.edu.ctu.lrd.sharedkernel.*;

import java.time.*;
import java.util.*;

public final class AcademicService {
    private final AcademicRepository repository;
    private final AcademicEffects effects;
    private final Clock clock;

    public AcademicService(AcademicRepository repository, AcademicEffects effects, Clock clock) {
        this.repository = repository;
        this.effects = effects;
        this.clock = clock;
    }

    private void write(Actor a) {
        a.require("academics:manage");
        repository.lockChanges();
    }

    public AcademicProgram program(Actor a, UUID id) {
        a.require("academics:manage");
        return program(id);
    }

    private AcademicProgram program(UUID id) {
        return repository
                .program(id)
                .orElseThrow(
                        () -> new DomainException("NOT_FOUND", "Không tìm thấy chương trình."));
    }

    public AdmissionCampaign admission(Actor a, UUID id) {
        a.require("academics:manage");
        return repository
                .admission(id)
                .orElseThrow(() -> new DomainException("NOT_FOUND", "Không tìm thấy đợt tuyển."));
    }

    public AcademicProgram createProgram(
            Actor a, String code, String locale, EducationLevel level) {
        write(a);
        var p = AcademicProgram.create(code, locale, level, clock.instant());
        repository.insert(p);
        effects.audit(a, "PROGRAM_CREATED", p.id(), "");
        return p;
    }

    public AdmissionCampaign createAdmission(
            Actor a, String code, String locale, EducationLevel level) {
        write(a);
        var p = AdmissionCampaign.create(code, locale, level, clock.instant());
        repository.insert(p);
        effects.audit(a, "ADMISSION_CREATED", p.id(), "");
        return p;
    }

    private AcademicProgram persist(
            Actor a, AcademicProgram before, AcademicProgram after, String action, String reason) {
        if (before == after) return before;
        effects.validateAssets(after.draft().assetIds(), a);
        repository.save(after, before.version());
        effects.synchronize(after);
        effects.audit(a, action, after.id(), reason);
        return after;
    }

    private AdmissionCampaign persist(
            Actor a,
            AdmissionCampaign before,
            AdmissionCampaign after,
            String action,
            String reason) {
        if (before == after) return before;
        effects.validateAssets(after.draft().assetIds(), a);
        repository.save(after, before.version());
        effects.synchronize(after);
        effects.audit(a, action, after.id(), reason);
        return after;
    }

    public AcademicProgram reviseProgram(Actor a, UUID id, ProgramDraft draft, long expected) {
        write(a);
        var p = program(a, id);
        return persist(
                a, p, p.reviseEdition(draft, expected, clock.instant()), "PROGRAM_DRAFT_SAVED", "");
    }

    public AcademicProgram publishProgram(Actor a, UUID id, long expected, long draftVersion) {
        write(a);
        var p = program(a, id);
        return persist(
                a,
                p,
                p.publishEdition(expected, draftVersion, a.id(), clock.instant()),
                "PROGRAM_PUBLISHED",
                "");
    }

    public AcademicProgram retireProgram(Actor a, UUID id, long expected, String reason) {
        write(a);
        var p = program(a, id);
        return persist(
                a,
                p,
                p.retire(
                        expected,
                        reason,
                        repository.hasActiveAdmissions(id, clock.instant()),
                        clock.instant()),
                "PROGRAM_RETIRED",
                reason);
    }

    public AcademicProgram reinstateProgram(Actor a, UUID id, long expected) {
        write(a);
        var p = program(a, id);
        return persist(a, p, p.reinstate(expected, clock.instant()), "PROGRAM_REINSTATED", "");
    }

    public AcademicProgram restoreProgram(Actor a, UUID id, UUID edition, long expected) {
        write(a);
        var p = program(a, id);
        var e =
                repository
                        .programEdition(id, edition)
                        .orElseThrow(
                                () ->
                                        new DomainException(
                                                "NOT_FOUND", "Không tìm thấy phiên bản."));
        return persist(a, p, p.restore(e, expected, clock.instant()), "PROGRAM_DRAFT_RESTORED", "");
    }

    private List<AdmissionCampaign.ProgramSnapshot> references(
            AdmissionCampaign campaign, AdmissionDraft draft) {
        return draft.programs().stream()
                .map(
                        choice -> {
                            var p = program(choice.programId());
                            require(
                                    p.live() != null
                                            && !p.retired()
                                            && p.locale().equals(campaign.locale())
                                            && p.level() == campaign.level(),
                                    "INVALID_PROGRAM_REFERENCE",
                                    "Chương trình phải đang công khai, cùng ngôn ngữ và bậc đào"
                                            + " tạo.");
                            return new AdmissionCampaign.ProgramSnapshot(
                                    p.id(), p.code(), p.live().snapshot().title(), p.level());
                        })
                .toList();
    }

    public AdmissionCampaign reviseAdmission(
            Actor a, UUID id, AdmissionDraft draft, long expected) {
        write(a);
        var p = admission(a, id);
        for (var choice : draft.programs()) {
            var program = program(choice.programId());
            require(
                    program.locale().equals(p.locale()) && program.level() == p.level(),
                    "INVALID_PROGRAM_REFERENCE",
                    "Chương trình khác ngôn ngữ hoặc bậc đào tạo.");
        }
        return persist(
                a, p, p.revise(draft, expected, clock.instant()), "ADMISSION_DRAFT_SAVED", "");
    }

    public AdmissionCampaign publishAdmission(Actor a, UUID id, long expected, long draftVersion) {
        write(a);
        var p = admission(a, id);
        return persist(
                a,
                p,
                p.publish(
                        expected, draftVersion, references(p, p.draft()), a.id(), clock.instant()),
                "ADMISSION_PUBLISHED",
                "");
    }

    public AdmissionCampaign extend(
            Actor a, UUID id, long expected, Instant deadline, String reason) {
        write(a);
        var p = admission(a, id);
        if (p.live() != null) references(p, p.live().snapshot());
        return persist(
                a,
                p,
                p.extendDeadline(expected, deadline, reason, a.id(), clock.instant()),
                "ADMISSION_DEADLINE_EXTENDED",
                reason);
    }

    public AdmissionCampaign close(Actor a, UUID id, long expected, String reason) {
        write(a);
        var p = admission(a, id);
        return persist(
                a,
                p,
                p.closeEarly(expected, reason, a.id(), clock.instant()),
                "ADMISSION_CLOSED_EARLY",
                reason);
    }

    public AdmissionCampaign withdraw(Actor a, UUID id, long expected, String reason) {
        write(a);
        var p = admission(a, id);
        return persist(
                a, p, p.withdraw(expected, reason, clock.instant()), "ADMISSION_WITHDRAWN", reason);
    }

    public AdmissionCampaign restoreAdmission(Actor a, UUID id, UUID edition, long expected) {
        write(a);
        var p = admission(a, id);
        var e =
                repository
                        .admissionEdition(id, edition)
                        .orElseThrow(
                                () ->
                                        new DomainException(
                                                "NOT_FOUND", "Không tìm thấy phiên bản."));
        return persist(
                a, p, p.restore(e, expected, clock.instant()), "ADMISSION_DRAFT_RESTORED", "");
    }
}
