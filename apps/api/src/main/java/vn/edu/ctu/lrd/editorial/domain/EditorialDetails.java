package vn.edu.ctu.lrd.editorial.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Structured metadata; the linked article owns the long-form story. */
public record EditorialDetails(String title, String slug, String summary, UUID thumbnailId,
        String thumbnailAlt, String externalUrl, UUID articleId, LocalDate startsOn,
        LocalDate endsOn, String location, String organizer, LocalDate deadline,
        String employer, String position, String theme, String format, String audience,
        String registrationUrl, List<EventSpeaker> speakers, List<EventSession> sessions) {
    public EditorialDetails {
        title = clean(title); slug = clean(slug); summary = clean(summary);
        thumbnailAlt = clean(thumbnailAlt); externalUrl = clean(externalUrl);
        location = clean(location); organizer = clean(organizer);
        employer = clean(employer); position = clean(position);
        theme = clean(theme); format = clean(format); audience = clean(audience);
        registrationUrl = clean(registrationUrl);
        speakers = speakers == null ? List.of() : List.copyOf(speakers);
        sessions = sessions == null ? List.of() : List.copyOf(sessions);
        require(title.length() <= 220 && slug.matches("[a-z0-9]+(?:-[a-z0-9]+)*") && slug.length() <= 160,
                "INVALID_EDITORIAL", "Tiêu đề hoặc đường dẫn không hợp lệ.");
        require(summary.length() <= 1200 && thumbnailAlt.length() <= 300 && externalUrl.length() <= 1000
                && location.length() <= 300 && organizer.length() <= 200 && employer.length() <= 200
                && position.length() <= 200 && theme.length() <= 500 && audience.length() <= 1000
                && registrationUrl.length() <= 1000 && speakers.size() <= 100 && sessions.size() <= 200,
                "INVALID_EDITORIAL", "Thông tin vượt giới hạn.");
        require(Set.of("", "IN_PERSON", "ONLINE", "HYBRID").contains(format),
                "INVALID_EDITORIAL", "Hình thức hội thảo không hợp lệ.");
        require(registrationUrl.isBlank() || registrationUrl.matches("https?://[^\\s]+"),
                "INVALID_EDITORIAL", "Liên kết đăng ký phải dùng http hoặc https.");
        require(externalUrl.isBlank() || externalUrl.matches("https?://[^\\s]+"),
                "INVALID_EDITORIAL", "Liên kết ngoài phải dùng http hoặc https.");
        require(startsOn == null || endsOn == null || !endsOn.isBefore(startsOn),
                "INVALID_EDITORIAL", "Ngày kết thúc trước ngày bắt đầu.");
    }
    public EditorialDetails(String title, String slug, String summary, UUID thumbnailId,
            String thumbnailAlt, String externalUrl, UUID articleId, LocalDate startsOn,
            LocalDate endsOn, String location, String organizer, LocalDate deadline,
            String employer, String position) {
        this(title, slug, summary, thumbnailId, thumbnailAlt, externalUrl, articleId, startsOn,
                endsOn, location, organizer, deadline, employer, position,
                "", "", "", "", List.of(), List.of());
    }
    private static String clean(String value) { return value == null ? "" : value.strip(); }
    public void requirePublishable() {
        require(title.length() >= 3 && !summary.isBlank() && articleId != null,
                "EDITORIAL_INCOMPLETE", "Cần tiêu đề, mô tả và bài viết liên kết để công khai.");
        require(thumbnailId == null || !thumbnailAlt.isBlank(), "EDITORIAL_INCOMPLETE", "Cần mô tả ảnh.");
    }
}
