package vn.edu.ctu.lrd.academics.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import java.time.*;
import java.util.*;

public record AdmissionCampaign(
        UUID id,
        String code,
        String locale,
        EducationLevel level,
        AdmissionDraft draft,
        long draftVersion,
        long version,
        AdmissionEdition live,
        Instant createdAt,
        Instant updatedAt) {
    public enum Status {
        NOTICE,
        UPCOMING,
        OPEN,
        CLOSED,
        CLOSED_EARLY
    }

    public record ProgramSnapshot(UUID id, String code, String title, EducationLevel level) {}

    public record AdmissionEdition(
            UUID id,
            UUID admissionId,
            Long draftVersion,
            AdmissionDraft snapshot,
            List<ProgramSnapshot> programs,
            Instant closedAt,
            String closureReason,
            String action,
            String reason,
            Instant publishedAt,
            UUID publishedBy) {
        public AdmissionEdition {
            programs = List.copyOf(programs);
        }

        public Status statusAt(Instant now) {
            return AdmissionCampaign.statusAt(snapshot, closedAt, now);
        }
    }

    public static Status statusAt(AdmissionDraft snapshot, Instant closedAt, Instant now) {
        if (closedAt != null) return Status.CLOSED_EARLY;
        if (snapshot.closesAt() != null && !now.isBefore(snapshot.closesAt())) return Status.CLOSED;
        if (snapshot.opensAt() == null || snapshot.closesAt() == null) return Status.NOTICE;
        if (now.isBefore(snapshot.opensAt())) return Status.UPCOMING;
        return Status.OPEN;
    }

    public static AdmissionCampaign create(
            String code, String locale, EducationLevel level, Instant now) {
        require(level != null, "INVALID_ADMISSION", "Cần chọn bậc đào tạo.");
        AcademicRules.locale(locale);
        return new AdmissionCampaign(
                UUID.randomUUID(),
                AcademicRules.code(code),
                locale,
                level,
                AdmissionDraft.empty(now.atZone(ZoneId.of("Asia/Ho_Chi_Minh")).getYear()),
                1,
                0,
                null,
                now,
                now);
    }

    public AdmissionCampaign revise(AdmissionDraft next, long expected, Instant now) {
        AcademicRules.expected(version, expected);
        require(
                live == null
                        || (live.snapshot().opensAt() == null
                                        || Objects.equals(
                                                next.opensAt(), live.snapshot().opensAt()))
                                && (live.snapshot().closesAt() == null
                                        || Objects.equals(
                                                next.closesAt(), live.snapshot().closesAt())),
                "USE_DEADLINE_ACTION",
                "Đợt đã công khai cần dùng thao tác Gia hạn để đổi mốc đóng. Mốc mở được giữ cố"
                        + " định.");
        return new AdmissionCampaign(
                id, code, locale, level, next, draftVersion + 1, version + 1, live, createdAt, now);
    }

    public AdmissionCampaign publish(
            long expected,
            long expectedDraft,
            List<ProgramSnapshot> programs,
            UUID actor,
            Instant now) {
        AcademicRules.expected(version, expected);
        AcademicRules.expected(draftVersion, expectedDraft);
        draft.validateForPublication();
        require(
                programs.size() == draft.programs().size()
                        && programs.stream().allMatch(p -> p.level() == level),
                "INVALID_PROGRAM_REFERENCE",
                "Mỗi chương trình phải đang công khai và cùng bậc đào tạo.");
        require(
                programs.stream()
                        .map(ProgramSnapshot::id)
                        .collect(java.util.stream.Collectors.toSet())
                        .equals(
                                draft.programs().stream()
                                        .map(AdmissionDraft.Choice::programId)
                                        .collect(java.util.stream.Collectors.toSet())),
                "INVALID_PROGRAM_REFERENCE",
                "Danh sách chương trình không khớp.");
        if (live != null && draft.equals(live.snapshot())) return this;
        var edition =
                new AdmissionEdition(
                        UUID.randomUUID(),
                        id,
                        draftVersion,
                        draft,
                        programs,
                        live == null ? null : live.closedAt(),
                        live == null ? "" : live.closureReason(),
                        "PUBLISHED",
                        "",
                        now,
                        actor);
        return new AdmissionCampaign(
                id, code, locale, level, draft, draftVersion, version + 1, edition, createdAt, now);
    }

    public AdmissionCampaign extendDeadline(
            long expected, Instant newDeadline, String reason, UUID actor, Instant now) {
        AcademicRules.expected(version, expected);
        require(live != null, "NOT_PUBLISHED", "Đợt tuyển chưa công khai.");
        require(
                live.closedAt() == null,
                "CLOSED_EARLY",
                "Đợt đã đóng sớm không thể gia hạn; tạo đợt mới nếu cần tuyển lại.");
        require(
                live.snapshot().closesAt() != null
                        && newDeadline != null
                        && newDeadline.isAfter(live.snapshot().closesAt())
                        && newDeadline.isAfter(now),
                "INVALID_DEADLINE",
                "Hạn mới phải sau hạn cũ và sau thời điểm hiện tại.");
        String why = AcademicRules.reason(reason);
        var next = draft.withDeadline(newDeadline);
        var edition =
                new AdmissionEdition(
                        UUID.randomUUID(),
                        id,
                        null,
                        live.snapshot().withDeadline(newDeadline),
                        live.programs(),
                        null,
                        "",
                        "DEADLINE_EXTENDED",
                        why,
                        now,
                        actor);
        return new AdmissionCampaign(
                id,
                code,
                locale,
                level,
                next,
                draftVersion + 1,
                version + 1,
                edition,
                createdAt,
                now);
    }

    public AdmissionCampaign closeEarly(long expected, String reason, UUID actor, Instant now) {
        AcademicRules.expected(version, expected);
        require(live != null, "NOT_PUBLISHED", "Đợt tuyển chưa công khai.");
        require(
                live.statusAt(now) == Status.OPEN || live.statusAt(now) == Status.UPCOMING,
                "ADMISSION_CLOSED",
                "Đợt tuyển đã kết thúc.");
        String why = AcademicRules.reason(reason);
        var edition =
                new AdmissionEdition(
                        UUID.randomUUID(),
                        id,
                        null,
                        live.snapshot(),
                        live.programs(),
                        now,
                        why,
                        "CLOSED_EARLY",
                        why,
                        now,
                        actor);
        return new AdmissionCampaign(
                id, code, locale, level, draft, draftVersion, version + 1, edition, createdAt, now);
    }

    public AdmissionCampaign withdraw(long expected, String reason, Instant now) {
        AcademicRules.expected(version, expected);
        require(live != null, "NOT_PUBLISHED", "Đợt tuyển chưa công khai.");
        AcademicRules.reason(reason);
        return new AdmissionCampaign(
                id, code, locale, level, draft, draftVersion, version + 1, null, createdAt, now);
    }

    public AdmissionCampaign restore(AdmissionEdition edition, long expected, Instant now) {
        require(
                edition.admissionId().equals(id),
                "NOT_FOUND",
                "Phiên bản không thuộc đợt tuyển này.");
        var snapshot = edition.snapshot();
        // Keep the operational window when restoring editorial text into a live campaign.
        if (live != null)
            snapshot =
                    new AdmissionDraft(
                            snapshot.title(),
                            snapshot.slug(),
                            snapshot.summary(),
                            snapshot.description(),
                            snapshot.year(),
                            snapshot.programs(),
                            live.snapshot().opensAt(),
                            live.snapshot().closesAt(),
                            snapshot.applicationUrl(),
                            snapshot.requirements(),
                            snapshot.selectionMethod(),
                            snapshot.schedule(),
                            snapshot.contact(),
                            snapshot.coverId(),
                            snapshot.coverAlt(),
                            snapshot.resources(),
                            snapshot.source());
        return revise(snapshot, expected, now);
    }

    public String publicationStatus() {
        return live == null ? "DRAFT" : draft.equals(live.snapshot()) ? "PUBLISHED" : "CHANGED";
    }
}
