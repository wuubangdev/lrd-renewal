package vn.edu.ctu.lrd.directory.domain;

import static org.junit.jupiter.api.Assertions.*;
import java.util.List;
import org.junit.jupiter.api.Test;

class StaffAcademicInfoTest {
    @Test void historicalSectionsAreReadAsTypedAcademicFields() {
        var sections = List.of(
                new StaffSection("I. LÝ LỊCH KHOA HỌC", List.of(
                        new StaffBlock(StaffBlock.Kind.FACT, "Học vị cao nhất", "Tiến sĩ Năm phong học vị: 2017", List.of(), List.of(), null, ""),
                        new StaffBlock(StaffBlock.Kind.FACT, "Chức danh khoa học cao nhất", "Giảng viên Năm phong: 2008", List.of(), List.of(), null, ""))),
                new StaffSection("II. QUÁ TRÌNH ĐÀO TẠO", List.of(
                        new StaffBlock(StaffBlock.Kind.LIST, "", "", List.of("Đại học"), List.of(), null, ""),
                        new StaffBlock(StaffBlock.Kind.FACT, "Nơi đào tạo", "Đại học Cần Thơ", List.of(), List.of(), null, ""),
                        new StaffBlock(StaffBlock.Kind.FACT, "Chuyên ngành đào tạo", "Quản lý đất đai", List.of(), List.of(), null, ""))),
                new StaffSection("III. QUÁ TRÌNH CÔNG TÁC", List.of(
                        new StaffBlock(StaffBlock.Kind.TABLE, "", "", List.of(), List.of(
                                List.of("Thời gian", "Nơi công tác", "Công việc"),
                                List.of("2020–nay", "Đại học Cần Thơ", "Giảng viên")), null, ""))),
                new StaffSection("2020", List.of(
                        new StaffBlock(StaffBlock.Kind.TABLE, "", "", List.of(), List.of(
                                List.of("1", "Công bố thứ nhất", "Tạp chí A"),
                                List.of("2", "Công bố thứ hai", "Tạp chí B")), null, ""))));
        var details = new StaffDetails("Nguyễn Văn An", "nguyen-van-an", "", "", "", "", "", "", "", "", "",
                List.of(), null, "", "EDITORIAL", sections, null, List.of(), "");
        assertEquals("Đại học Cần Thơ", details.academic().undergraduate().getFirst().institution());
        assertEquals("Quản lý đất đai", details.academic().undergraduate().getFirst().major());
        assertEquals("Giảng viên", details.academic().workHistory().getFirst().role());
        assertEquals("2017", details.academic().highestDegreeYear());
        assertEquals("Giảng viên", details.academic().academicRank());
        assertEquals("2008", details.academic().academicRankYear());
        assertEquals(2, details.academic().publications().size());
        assertEquals(details.academic(), details.publicCopy().academic());
    }

    @Test void everyNewProfileHasTheSameEmptyDossierShape() {
        var profile = StaffProfile.create("vi", java.time.Instant.now());
        assertNotNull(profile.draft().academic());
        assertTrue(profile.draft().academic().researchProjects().isEmpty());
        assertTrue(profile.draft().academic().postgraduate().isEmpty());
    }
}
