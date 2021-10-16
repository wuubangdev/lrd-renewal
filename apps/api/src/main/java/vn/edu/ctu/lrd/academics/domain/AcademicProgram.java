package vn.edu.ctu.lrd.academics.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import java.time.Instant;
import java.util.UUID;

public record AcademicProgram(
        UUID id,
        String code,
        String locale,
        EducationLevel level,
        ProgramDraft draft,
        long draftVersion,
        long version,
        ProgramEdition live,
        boolean retired,
        String retirementReason,
        Instant createdAt,
        Instant updatedAt) {
    public record ProgramEdition(
            UUID id,
            UUID programId,
            long draftVersion,
            ProgramDraft snapshot,
            Instant publishedAt,
            UUID publishedBy) {}

    public static AcademicProgram create(
            String code, String locale, EducationLevel level, Instant now) {
        require(level != null, "INVALID_PROGRAM", "Cần chọn bậc đào tạo.");
        AcademicRules.locale(locale);
        return new AcademicProgram(
                UUID.randomUUID(),
                AcademicRules.code(code),
                locale,
                level,
                ProgramDraft.empty(level),
                1,
                0,
                null,
                false,
                "",
                now,
                now);
    }

    public AcademicProgram reviseEdition(ProgramDraft next, long expected, Instant now) {
        AcademicRules.expected(version, expected);
        require(!retired, "PROGRAM_RETIRED", "Hãy khôi phục chương trình trước khi sửa.");
        return new AcademicProgram(
                id,
                code,
                locale,
                level,
                next,
                draftVersion + 1,
                version + 1,
                live,
                false,
                "",
                createdAt,
                now);
    }

    public AcademicProgram publishEdition(
            long expected, long expectedDraft, UUID actor, Instant now) {
        AcademicRules.expected(version, expected);
        AcademicRules.expected(draftVersion, expectedDraft);
        require(
                !retired,
                "PROGRAM_RETIRED",
                "Chương trình đã ngừng công khai. Hãy khôi phục về bản nháp.");
        draft.validateForPublication(level);
        if (live != null && live.draftVersion() == draftVersion) return this;
        var edition = new ProgramEdition(UUID.randomUUID(), id, draftVersion, draft, now, actor);
        return new AcademicProgram(
                id,
                code,
                locale,
                level,
                draft,
                draftVersion,
                version + 1,
                edition,
                false,
                "",
                createdAt,
                now);
    }

    public AcademicProgram retire(
            long expected, String reason, boolean hasActiveAdmissions, Instant now) {
        AcademicRules.expected(version, expected);
        require(!retired, "PROGRAM_RETIRED", "Chương trình đã ngừng công khai.");
        require(
                !hasActiveAdmissions,
                "ACTIVE_ADMISSIONS",
                "Còn đợt tuyển đang mở hoặc sắp mở. Hãy đóng/gỡ đợt tuyển trước.");
        return new AcademicProgram(
                id,
                code,
                locale,
                level,
                draft,
                draftVersion,
                version + 1,
                null,
                true,
                AcademicRules.reason(reason),
                createdAt,
                now);
    }

    public AcademicProgram reinstate(long expected, Instant now) {
        AcademicRules.expected(version, expected);
        require(retired, "INVALID_PROGRAM", "Chương trình chưa ngừng công khai.");
        return new AcademicProgram(
                id,
                code,
                locale,
                level,
                draft,
                draftVersion,
                version + 1,
                null,
                false,
                "",
                createdAt,
                now);
    }

    public AcademicProgram restore(ProgramEdition edition, long expected, Instant now) {
        require(
                edition.programId().equals(id),
                "NOT_FOUND",
                "Phiên bản không thuộc chương trình này.");
        return reviseEdition(edition.snapshot(), expected, now);
    }

    public String status() {
        return retired
                ? "RETIRED"
                : live == null
                        ? "DRAFT"
                        : live.draftVersion() == draftVersion ? "PUBLISHED" : "CHANGED";
    }
}
