package vn.edu.ctu.lrd.research.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import java.util.*;

/** Stable citation and metadata; full original citation is preserved when parsing is uncertain. */
public record ResearchDetails(String title, String slug, String summary, Integer year,
        String venue, String publisher, String volume, String doi, String isbn, String authorsText,
        String citation, String sourceUrl, String documentUrl, String level, String period,
        String progress, UUID coverId, String coverAlt, List<Contributor> contributors,
        UUID sourceArticleId, String sourceKey) {
    public ResearchDetails {
        title = clean(title); slug = clean(slug); summary = clean(summary);
        venue = clean(venue); publisher = clean(publisher); volume = clean(volume);
        doi = clean(doi); isbn = clean(isbn); authorsText = clean(authorsText); citation = clean(citation);
        sourceUrl = clean(sourceUrl); documentUrl = clean(documentUrl);
        level = clean(level); period = clean(period); progress = clean(progress);
        coverAlt = clean(coverAlt); sourceKey = clean(sourceKey);
        contributors = contributors == null ? List.of() : List.copyOf(contributors);
        require(title.length() <= 500 && slug.matches("[a-z0-9]+(?:-[a-z0-9]+)*") && slug.length() <= 200,
                "INVALID_RESEARCH", "Tiêu đề hoặc đường dẫn không hợp lệ.");
        require(summary.length() <= 3000 && venue.length() <= 300 && publisher.length() <= 300
                && volume.length() <= 300 && doi.length() <= 200 && isbn.length() <= 100
                && authorsText.length() <= 3000
                && citation.length() <= 5000 && sourceUrl.length() <= 1000 && documentUrl.length() <= 1000
                && level.length() <= 160 && period.length() <= 160 && progress.length() <= 160
                && coverAlt.length() <= 300 && sourceKey.length() <= 160 && contributors.size() <= 80,
                "INVALID_RESEARCH", "Thông tin nghiên cứu vượt giới hạn.");
        require(year == null || year >= 1900 && year <= 2100,
                "INVALID_RESEARCH", "Năm công bố không hợp lệ.");
        require(doi.isBlank() || doi.matches("(?i)10\\.\\d{4,9}/\\S+"),
                "INVALID_RESEARCH", "DOI không hợp lệ.");
        require(isbn.isBlank() || isbn.replaceAll("[- ]", "").matches("(?:\\d{10}|\\d{13})"),
                "INVALID_RESEARCH", "ISBN không hợp lệ.");
        require(url(sourceUrl) && url(documentUrl), "INVALID_RESEARCH", "Liên kết phải dùng HTTP hoặc HTTPS.");
        var linked = new HashSet<UUID>();
        for (var person : contributors) if (person.staffId() != null)
            require(linked.add(person.staffId()), "INVALID_RESEARCH", "Một cán bộ chỉ xuất hiện một lần.");
    }
    private static String clean(String value) { return value == null ? "" : value.strip(); }
    private static boolean url(String value) { return value.isBlank() || value.matches("https?://[^\\s]+" ) || value.startsWith("/") && !value.startsWith("//"); }
    public void requirePublishable() {
        require(title.length() >= 4, "RESEARCH_INCOMPLETE", "Cần tên công trình hoặc đề tài.");
        require(coverId == null || !coverAlt.isBlank(), "RESEARCH_INCOMPLETE", "Cần mô tả ảnh đại diện.");
    }
    public Set<UUID> staffIds() {
        var ids = new HashSet<UUID>();
        contributors.stream().map(Contributor::staffId).filter(Objects::nonNull).forEach(ids::add);
        return Set.copyOf(ids);
    }
    public Set<UUID> assetIds() { return coverId == null ? Set.of() : Set.of(coverId); }
}
