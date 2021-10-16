package vn.edu.ctu.lrd.editorial.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

public record EventSpeaker(String name, String title, String affiliation, String topic) {
    public EventSpeaker {
        name = clean(name); title = clean(title); affiliation = clean(affiliation); topic = clean(topic);
        require(name.length() <= 200 && title.length() <= 200 && affiliation.length() <= 300
                        && topic.length() <= 1000, "INVALID_EDITORIAL", "Thông tin diễn giả vượt giới hạn.");
    }
    private static String clean(String value) { return value == null ? "" : value.strip(); }
}
