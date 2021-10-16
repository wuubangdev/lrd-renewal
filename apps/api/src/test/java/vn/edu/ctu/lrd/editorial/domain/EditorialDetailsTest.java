package vn.edu.ctu.lrd.editorial.domain;

import static org.junit.jupiter.api.Assertions.*;
import java.util.List;
import org.junit.jupiter.api.Test;

class EditorialDetailsTest {
    @Test void eventOwnsStructuredSpeakersAndSessions() {
        var event = new EditorialDetails("Hội thảo đất đai", "hoi-thao-dat-dai", "Mô tả", null,
                "", "", null, null, null, "Cần Thơ", "Bộ môn", null, "", "",
                "Đất đai bền vững", "HYBRID", "Giảng viên", "https://example.org/dang-ky",
                List.of(new EventSpeaker("Nguyễn An", "TS.", "ĐHCT", "GIS")),
                List.of(new EventSession("08:30", "Khai mạc", "Nguyễn An", "")));
        assertEquals("Nguyễn An", event.speakers().getFirst().name());
        assertEquals("Khai mạc", event.sessions().getFirst().title());
        assertEquals("HYBRID", event.format());
    }

    @Test void oldEditorialRecordsReceiveEmptyFixedEventFields() {
        var old = new EditorialDetails("Tin tức", "tin-tuc", "Mô tả", null, "", "", null,
                null, null, "", "", null, "", "");
        assertTrue(old.speakers().isEmpty());
        assertTrue(old.sessions().isEmpty());
        assertEquals("", old.theme());
    }
}
