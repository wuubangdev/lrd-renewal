package vn.edu.ctu.lrd.discovery.api;

import java.time.Instant;
import java.util.*;

public interface EducationCatalog {
    record Document(
            UUID id,
            String kind,
            String code,
            String locale,
            String level,
            String slug,
            String title,
            String summary,
            UUID coverId,
            Integer year,
            Instant opensAt,
            Instant closesAt,
            Instant closedAt,
            List<UUID> programIds,
            Instant publishedAt) {
        public String statusAt(Instant now) {
            if (!kind.equals("ADMISSION")) return "PUBLISHED";
            if (closedAt != null) return "CLOSED_EARLY";
            if (now.isBefore(opensAt)) return "UPCOMING";
            return now.isBefore(closesAt) ? "OPEN" : "CLOSED";
        }
    }

    record Result(List<Document> items, long total, int page, int size, Instant asOf) {}

    void index(Document d);

    void remove(UUID id);

    List<Document> findPublished(String locale, String kind, Set<UUID> ids);

    Result search(
            String locale,
            String kind,
            String query,
            String level,
            String status,
            Integer year,
            UUID program,
            int page,
            int size,
            Instant now);
}
