package vn.edu.ctu.lrd.academics.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import java.net.URI;
import java.util.*;

public final class AcademicRules {
    private AcademicRules() {}

    public static String text(String value, int max) {
        require(
                value != null && value.length() <= max,
                "INVALID_ACADEMICS",
                "Nội dung thiếu hoặc vượt quá độ dài cho phép.");
        return value.strip();
    }

    public static String code(String value) {
        String normalized = text(value, 30).toUpperCase(Locale.ROOT);
        require(
                normalized.matches("[A-Z0-9][A-Z0-9._-]{1,29}"),
                "INVALID_CODE",
                "Mã cần 2–30 ký tự chữ, số, dấu chấm, gạch ngang hoặc gạch dưới.");
        return normalized;
    }

    public static String slug(String value) {
        value = text(value, 180);
        require(
                value.isEmpty() || value.matches("[a-z0-9]+(?:-[a-z0-9]+)*"),
                "INVALID_SLUG",
                "Đường dẫn dùng chữ thường không dấu, số và gạch ngang.");
        return value;
    }

    public static void locale(String locale) {
        require(
                locale != null && Set.of("vi", "en").contains(locale),
                "INVALID_LOCALE",
                "Ngôn ngữ không hợp lệ.");
    }

    public static String https(String value) {
        value = text(value, 2048);
        if (value.isEmpty()) return value;
        try {
            var uri = URI.create(value);
            require(
                    "https".equalsIgnoreCase(uri.getScheme())
                            && uri.getHost() != null
                            && uri.getRawUserInfo() == null
                            && !value.contains("\\")
                            && value.chars().noneMatch(Character::isISOControl),
                    "INVALID_LINK",
                    "Liên kết phải là URL HTTPS hợp lệ.");
        } catch (IllegalArgumentException ex) {
            require(false, "INVALID_LINK", "Liên kết HTTPS không hợp lệ.");
        }
        return value;
    }

    public static List<String> lines(List<String> values) {
        require(
                values != null && values.size() <= 30,
                "INVALID_ACADEMICS",
                "Danh sách có tối đa 30 mục.");
        return values.stream().map(v -> text(v, 1000)).toList();
    }

    public static void expected(long actual, long expected) {
        require(
                actual == expected,
                "STALE_VERSION",
                "Nội dung đã thay đổi ở nơi khác. Bản đang nhập được giữ lại; hãy tải lại trước khi"
                        + " tiếp tục.");
    }

    public static String reason(String value) {
        String reason = text(value, 1000);
        require(reason.length() >= 5, "REASON_REQUIRED", "Vui lòng ghi lý do, ít nhất 5 ký tự.");
        return reason;
    }
}
