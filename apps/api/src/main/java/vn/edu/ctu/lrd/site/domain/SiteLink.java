package vn.edu.ctu.lrd.site.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import java.net.URI;
import java.util.Set;
import java.util.UUID;

public record SiteLink(Kind kind, String target) {
    public enum Kind {
        HOME,
        NEWS,
        EVENTS,
        JOBS,
        RESEARCH,
        PROJECTS,
        PUBLICATIONS,
        TEXTBOOKS,
        DOCUMENTS,
        PEOPLE,
        LABS,
        LABORATORY,
        ANCHOR,
        CATEGORY,
        ARTICLE,
        PROGRAMS,
        ADMISSIONS,
        PROGRAM,
        ADMISSION,
        EXTERNAL,
        GROUP
    }

    public SiteLink {
        require(
                kind != null && target != null && target.length() <= 2048,
                "INVALID_LINK",
                "Liên kết không hợp lệ.");
        target = target.strip();
        switch (kind) {
            case HOME, NEWS, EVENTS, JOBS, RESEARCH, PROJECTS, PUBLICATIONS, TEXTBOOKS,
                    DOCUMENTS, PEOPLE, LABS, PROGRAMS, ADMISSIONS, GROUP ->
                    require(
                            target.isEmpty(),
                            "INVALID_LINK",
                            "Liên kết hệ thống không nhận đường dẫn tùy ý.");
            case ANCHOR ->
                    require(
                            Set.of(
                                            "gioi-thieu",
                                            "dao-tao",
                                            "tin-tuc",
                                            "ket-noi",
                                            "lien-he",
                                            "tuyen-sinh")
                                    .contains(target),
                            "INVALID_LINK",
                            "Vị trí trên trang chủ không hợp lệ.");
            case CATEGORY ->
                    require(
                            target.matches("[A-Z][A-Z0-9_]{2,39}"),
                            "INVALID_LINK",
                            "Chuyên mục không hợp lệ.");
            case ARTICLE, PROGRAM, ADMISSION, LABORATORY -> {
                try {
                    UUID.fromString(target);
                } catch (IllegalArgumentException ex) {
                    require(false, "INVALID_LINK", "Hãy chọn một nội dung công khai.");
                }
            }
            case EXTERNAL -> {
                try {
                    var uri = URI.create(target);
                    require(
                            "https".equalsIgnoreCase(uri.getScheme())
                                    && uri.getHost() != null
                                    && uri.getRawUserInfo() == null
                                    && !target.contains("\\")
                                    && target.chars().noneMatch(Character::isISOControl),
                            "INVALID_LINK",
                            "Liên kết ngoài phải là địa chỉ HTTPS hợp lệ.");
                } catch (IllegalArgumentException ex) {
                    require(false, "INVALID_LINK", "Liên kết HTTPS không hợp lệ.");
                }
            }
        }
    }

    public String key() {
        return kind.name() + ":" + target;
    }
}
