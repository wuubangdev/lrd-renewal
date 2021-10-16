package vn.edu.ctu.lrd;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;

import vn.edu.ctu.lrd.academics.domain.*;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;

class AcademicsDomainTest {
    final Instant now = Instant.parse("2026-10-15T03:00:00Z");
    final UUID actor = UUID.randomUUID(), programId = UUID.randomUUID();

    AdmissionDraft draft(String title, Instant opens, Instant closes) {
        return new AdmissionDraft(
                title,
                "tuyen-sinh",
                "Thông tin tuyển sinh",
                "Thông báo tuyển sinh dành cho chương trình đào tạo.",
                2026,
                List.of(new AdmissionDraft.Choice(programId, 30)),
                opens,
                closes,
                "https://ctu.edu.vn",
                "Tốt nghiệp theo yêu cầu",
                "Xét hồ sơ",
                List.of(),
                new PublicContact("Bộ môn", "info@ctu.edu.vn", ""),
                null,
                "");
    }

    AdmissionCampaign live() {
        var c =
                AdmissionCampaign.create("TS-26", "vi", EducationLevel.MASTER, now)
                        .revise(draft("Đợt tuyển thạc sĩ", now, now.plusSeconds(3600)), 0, now);
        return c.publish(
                1,
                2,
                List.of(
                        new AdmissionCampaign.ProgramSnapshot(
                                programId, "CT-01", "Chương trình thạc sĩ", EducationLevel.MASTER)),
                actor,
                now);
    }

    @Test
    void incompleteSourceWindowsNeverClaimToBeOpenAndKnownDeadlineStillCloses() {
        var d = draft("Thông báo từ nguồn", null, null);
        assertThatThrownBy(d::validateForPublication).hasMessageContaining("nguồn");
        var source =
                new SourceReference(
                        "https://lrd.ctu.edu.vn/",
                        LocalDate.of(2026, 3, 18),
                        LocalDate.of(2026, 10, 15));
        var notice =
                new AdmissionDraft(
                        d.title(),
                        d.slug(),
                        d.summary(),
                        d.description(),
                        d.year(),
                        d.programs(),
                        null,
                        null,
                        d.applicationUrl(),
                        d.requirements(),
                        d.selectionMethod(),
                        d.schedule(),
                        d.contact(),
                        null,
                        "",
                        List.of(new AcademicResource("Thông báo", "https://ctu.edu.vn/")),
                        source);
        notice.validateForPublication();
        assertThat(AdmissionCampaign.statusAt(notice, null, now))
                .isEqualTo(AdmissionCampaign.Status.NOTICE);
        var closing = notice.withDeadline(now);
        assertThat(AdmissionCampaign.statusAt(closing, null, now.minusNanos(1)))
                .isEqualTo(AdmissionCampaign.Status.NOTICE);
        assertThat(AdmissionCampaign.statusAt(closing, null, now))
                .isEqualTo(AdmissionCampaign.Status.CLOSED);
        assertThat(closing.resources()).isEqualTo(notice.resources());
        assertThat(closing.source()).isEqualTo(source);
        var c =
                AdmissionCampaign.create("NOTICE", "vi", EducationLevel.MASTER, now)
                        .revise(notice, 0, now);
        c =
                c.publish(
                        1,
                        2,
                        List.of(
                                new AdmissionCampaign.ProgramSnapshot(
                                        programId, "CT-01", "Thạc sĩ", EducationLevel.MASTER)),
                        actor,
                        now);
        var liveNotice = c;
        assertThatThrownBy(
                        () ->
                                liveNotice.extendDeadline(
                                        2, now.plusSeconds(3600), "Bổ sung hạn", actor, now))
                .isInstanceOf(DomainException.class);
        var scheduled =
                c.revise(draft("Đã có lịch chính thức", now, now.plusSeconds(3600)), 2, now);
        assertThat(scheduled.live().statusAt(now)).isEqualTo(AdmissionCampaign.Status.NOTICE);
        scheduled = scheduled.publish(3, 3, scheduled.live().programs(), actor, now);
        assertThat(scheduled.live().statusAt(now)).isEqualTo(AdmissionCampaign.Status.OPEN);
    }

    @Test
    void sourceReferencesAndDocumentsRejectUnsafeOrContradictoryEvidence() {
        assertThatThrownBy(() -> new AcademicResource("Biểu mẫu", "javascript:alert(1)"))
                .isInstanceOf(DomainException.class);
        assertThatThrownBy(
                        () ->
                                new SourceReference(
                                        "https://ctu.edu.vn",
                                        LocalDate.of(2026, 10, 16),
                                        LocalDate.of(2026, 10, 15)))
                .isInstanceOf(DomainException.class);
        var r = new AcademicResource("Khung đào tạo", "https://ctu.edu.vn/curriculum.pdf");
        assertThatThrownBy(() -> AcademicResource.validated(List.of(r, r)))
                .isInstanceOf(DomainException.class);
        assertThat(AcademicResource.validated(null)).isEmpty();
    }

    @Test
    void admissionWindowUsesInclusiveOpeningAndExclusiveClosing() {
        var c = live();
        assertThat(c.live().statusAt(now.minusNanos(1)))
                .isEqualTo(AdmissionCampaign.Status.UPCOMING);
        assertThat(c.live().statusAt(now)).isEqualTo(AdmissionCampaign.Status.OPEN);
        assertThat(c.live().statusAt(now.plusSeconds(3600)))
                .isEqualTo(AdmissionCampaign.Status.CLOSED);
    }

    @Test
    void extensionsAndClosurePreserveUnpublishedEditorialWork() {
        var c =
                live().revise(
                                draft("Nội dung nháp chưa công khai", now, now.plusSeconds(3600)),
                                2,
                                now);
        var next =
                c.extendDeadline(
                        3, now.plusSeconds(7200), "Bổ sung thời gian nộp hồ sơ", actor, now);
        assertThat(next.draft().title()).contains("nháp");
        assertThat(next.live().snapshot().title()).isEqualTo("Đợt tuyển thạc sĩ");
        assertThat(next.draft().closesAt()).isEqualTo(next.live().snapshot().closesAt());
        assertThat(next.publicationStatus()).isEqualTo("CHANGED");
        var closed = next.closeEarly(4, "Đã đủ chỉ tiêu đăng ký", actor, now);
        assertThat(closed.live().statusAt(now)).isEqualTo(AdmissionCampaign.Status.CLOSED_EARLY);
        assertThatThrownBy(
                        () ->
                                closed.extendDeadline(
                                        5, now.plusSeconds(8000), "Mở lại tuyển sinh", actor, now))
                .isInstanceOf(DomainException.class);
        var restored = closed.restore(c.live(), 5, now);
        assertThat(restored.draft().closesAt()).isEqualTo(next.live().snapshot().closesAt());
        assertThat(restored.live().closedAt()).isEqualTo(now);
    }

    @Test
    void publishedWindowCannotBeEditedAsOrdinaryDraftAndStaleWritesFail() {
        var c = live();
        assertThatThrownBy(
                        () -> c.revise(draft("Tiêu đề hợp lệ", now, now.plusSeconds(4000)), 2, now))
                .hasMessageContaining("Gia hạn");
        assertThatThrownBy(() -> c.closeEarly(0, "Lý do đóng sớm", actor, now))
                .hasMessageContaining("đã thay đổi");
        assertThatThrownBy(
                        () ->
                                c.extendDeadline(
                                        2, now.plusSeconds(3000), "Gia hạn ngắn hơn", actor, now))
                .hasMessageContaining("Hạn mới");
    }

    @Test
    void curriculumAndAccreditationValidateBusinessDatesAndEvidence() {
        var course =
                new CurriculumVersion.Course(
                        UUID.randomUUID(),
                        "DD101",
                        "Cơ sở đất đai",
                        BigDecimal.valueOf(3),
                        1,
                        false);
        assertThatThrownBy(
                        () ->
                                new CurriculumVersion(
                                        UUID.randomUUID(),
                                        "K52",
                                        "52",
                                        true,
                                        LocalDate.of(2026, 9, 1),
                                        null,
                                        "",
                                        List.of(course, course)))
                .isInstanceOf(DomainException.class);
        assertThatThrownBy(
                        () ->
                                new Accreditation(
                                        UUID.randomUUID(),
                                        "Kiểm định",
                                        "Tổ chức",
                                        LocalDate.of(2026, 1, 1),
                                        LocalDate.of(2025, 1, 1),
                                        "https://ctu.edu.vn"))
                .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> AcademicRules.https("javascript:alert(1)"))
                .isInstanceOf(DomainException.class);
        var a =
                new Accreditation(
                        UUID.randomUUID(),
                        "Kiểm định",
                        "Tổ chức",
                        LocalDate.of(2026, 1, 1),
                        LocalDate.of(2026, 10, 15),
                        "https://ctu.edu.vn");
        assertThat(a.validityAt(LocalDate.of(2026, 10, 15)))
                .isEqualTo(Accreditation.Validity.VALID);
        assertThat(a.validityAt(LocalDate.of(2026, 10, 16)))
                .isEqualTo(Accreditation.Validity.EXPIRED);
    }

    @Test
    void programRetirementIsGuardedAndReinstatementIsNotPublication() {
        var p = AcademicProgram.create("ct-01", "vi", EducationLevel.UNDERGRADUATE, now);
        assertThat(p.code()).isEqualTo("CT-01");
        assertThatThrownBy(() -> p.retire(0, "Ngừng chương trình", true, now))
                .hasMessageContaining("Còn đợt tuyển");
        var retired = p.retire(0, "Ngừng chương trình", false, now);
        assertThatThrownBy(() -> retired.reviseEdition(p.draft(), 1, now))
                .hasMessageContaining("khôi phục");
        var reinstated = retired.reinstate(1, now);
        assertThat(reinstated.live()).isNull();
        assertThat(reinstated.status()).isEqualTo("DRAFT");
    }
}
