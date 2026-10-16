package vn.edu.ctu.lrd.localization.domain;

import vn.edu.ctu.lrd.sharedkernel.DomainException;
import java.util.*;

/** Text selected for translation. Structure and machine-readable values stay untouched. */
public final class TranslationFields {
    private static final Set<String> IMMUTABLE_KEYS = Set.of(
            "id", "slug", "code", "kind", "type", "locale", "status", "level", "format",
            "url", "website", "email", "phone", "target", "category", "articleId", "staffId",
            "programId", "coverId", "portraitId", "thumbnailId", "imageId", "assetId",
            "sourceId", "registrationUrl", "externalUrl", "featuredIds", "newsCategory", "sections",
            "section", "admissionsMode", "degreeType", "positionType",
            "sourceKey", "doi", "isbn", "citation", "privateNotes", "privateFacts", "author",
            "publishedOn", "retrievedOn", "startsOn", "endsOn", "opensAt", "closesAt",
            "deadline", "at", "effectiveFrom", "effectiveTo", "issuedAt", "expiresAt");
    private static final int MAX_TEXT = 100_000;
    private TranslationFields() {}

    public static List<String> collect(String kind, Map<String, Object> source) {
        var result = new ArrayList<String>();
        visit(kind, source, "", result);
        if (result.size() > 1200 || result.stream().mapToInt(String::length).sum() > MAX_TEXT)
            throw new DomainException("AI_INPUT_TOO_LONG", "Nội dung quá dài để dịch trong một lần.");
        return result;
    }

    public static Map<String, Object> apply(String kind, Map<String, Object> source, List<String> translated) {
        var cursor = new int[] {0};
        @SuppressWarnings("unchecked")
        var result = (Map<String, Object>) transform(kind, source, "", translated, cursor);
        if (cursor[0] != translated.size())
            throw new DomainException("AI_INVALID_RESPONSE", "Gemini trả về số trường không khớp.");
        return result;
    }

    private static void visit(String kind, Object value, String key, List<String> text) {
        if (value instanceof Map<?, ?> map) {
            for (var entry : map.entrySet()) visit(kind, entry.getValue(), String.valueOf(entry.getKey()), text);
        } else if (value instanceof List<?> list) {
            for (var item : list) visit(kind, item, key, text);
        } else if (value instanceof String string && shouldTranslate(kind, key, string)) text.add(string);
    }

    private static Object transform(String kind, Object value, String key, List<String> translated, int[] cursor) {
        if (value instanceof Map<?, ?> map) {
            var result = new LinkedHashMap<String, Object>();
            for (var entry : map.entrySet())
                result.put(String.valueOf(entry.getKey()),
                        transform(kind, entry.getValue(), String.valueOf(entry.getKey()), translated, cursor));
            return result;
        }
        if (value instanceof List<?> list) {
            var result = new ArrayList<>();
            for (var item : list) result.add(transform(kind, item, key, translated, cursor));
            return result;
        }
        if (value instanceof String string && shouldTranslate(kind, key, string)) {
            if (cursor[0] >= translated.size() || translated.get(cursor[0]) == null
                    || translated.get(cursor[0]).isBlank())
                throw new DomainException("AI_INVALID_RESPONSE", "Gemini bỏ trống nội dung bản dịch.");
            return translated.get(cursor[0]++).strip();
        }
        return value;
    }

    private static boolean shouldTranslate(String kind, String key, String text) {
        if (IMMUTABLE_KEYS.contains(key) || text.isBlank()) return false;
        if ("STAFF".equals(kind) && key.equals("name")) return false;
        if (Set.of("RESEARCH", "EDITORIAL").contains(kind) && key.equals("name")) return false;
        if ("ARTICLE".equals(kind) && (key.equals("byline") || key.equals("author"))) return false;
        if (text.matches("(?i)https?://\\S+|mailto:\\S+|[\\w.+-]+@[\\w.-]+\\.[A-Za-z]{2,}")) return false;
        if (text.matches("[A-Z][A-Z0-9_]{2,}|[0-9+./:()\\s-]+")) return false;
        return true;
    }
}
