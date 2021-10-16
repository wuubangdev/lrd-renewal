package vn.edu.ctu.lrd.editorial.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

public record EventSession(String time, String title, String speaker, String description) {
    public EventSession {
        time = clean(time); title = clean(title); speaker = clean(speaker); description = clean(description);
        require(time.length() <= 100 && title.length() <= 300 && speaker.length() <= 200
                        && description.length() <= 2000, "INVALID_EDITORIAL", "Lịch trình hội thảo vượt giới hạn.");
    }
    private static String clean(String value) { return value == null ? "" : value.strip(); }
}
