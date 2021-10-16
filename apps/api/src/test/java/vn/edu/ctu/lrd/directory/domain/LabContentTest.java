package vn.edu.ctu.lrd.directory.domain;

import static org.junit.jupiter.api.Assertions.*;
import java.util.List;
import org.junit.jupiter.api.Test;

class LabContentTest {
    @Test void historicalSectionsBecomeEquipmentCoursesAndPublications() {
        var sections = List.of(
                new StaffSection("TRANG THIẾT BỊ CHÍNH", List.of(
                        new StaffBlock(StaffBlock.Kind.TABLE, "", "", List.of(), List.of(
                                List.of("STT", "Tên thiết bị", "Số lượng", "Hình ảnh"),
                                List.of("1", "Máy đo đất", "2 bộ", "")), null, ""))),
                new StaffSection("HỌC PHẦN PHỤ TRÁCH GIẢNG DẠY", List.of(
                        new StaffBlock(StaffBlock.Kind.FACT, "Sau đại học", "", List.of(), List.of(), null, ""),
                        new StaffBlock(StaffBlock.Kind.LIST, "", "", List.of("Đánh giá đất (MT659)"), List.of(), null, ""))),
                new StaffSection("Xuất bản", List.of(
                        new StaffBlock(StaffBlock.Kind.TEXT, "Công trình GIS năm 2020", "", List.of(), List.of(), null, ""))));
        var lab = new LaboratoryDetails("Phòng thí nghiệm đất", "phong-thi-nghiem-dat", "", "", "", "", "",
                "Giới thiệu", null, "", "EDITORIAL", sections, null);
        assertEquals("Máy đo đất", lab.content().equipment().getFirst().name());
        assertEquals("2 bộ", lab.content().equipment().getFirst().quantity());
        assertEquals(LabCourse.Level.POSTGRADUATE, lab.content().courses().getFirst().level());
        assertEquals("MT659", lab.content().courses().getFirst().code());
        assertEquals("2020", lab.content().publications().getFirst().year());
    }
}
