package vn.edu.ctu.lrd.discovery.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface SearchCatalog {
    record Document(
            UUID id,
            String locale,
            String slug,
            String title,
            String summary,
            String category,
            UUID coverId,
            String authorName,
            String text,
            Instant publishedAt,
            java.time.LocalDate sourcePublishedOn) {}

    record Result(List<Document> items, long total, int page, int size) {}

    void index(Document document);

    void remove(UUID id);

    Result search(String locale, String query, String category, int page, int size);

    java.util.List<Document> findPublished(String locale, java.util.Set<UUID> ids);
}
