package vn.edu.ctu.lrd.publishing.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

public record ContentDraft(
        String title,
        String slug,
        String summary,
        String category,
        RichDocument document,
        UUID coverId,
        String coverAlt,
        String byline,
        ContentOrigin origin) {
    public ContentDraft(
            String title,
            String slug,
            String summary,
            String category,
            RichDocument document,
            UUID coverId,
            String coverAlt) {
        this(title, slug, summary, category, document, coverId, coverAlt, "", null);
    }

    public ContentDraft(
            String title, String slug, String summary, String category, RichDocument document,
            UUID coverId, String coverAlt, ContentOrigin origin) {
        this(title, slug, summary, category, document, coverId, coverAlt, "", origin);
    }

    public ContentDraft {
        title = title == null ? "" : title.strip();
        summary = summary == null ? "" : summary.strip();
        coverAlt = coverAlt == null ? "" : coverAlt.strip();
        byline = byline == null ? "" : byline.strip();
        require(
                title.length() <= 200 && summary.length() <= 360,
                "INVALID_CONTENT",
                "Tiêu đề tối đa 200 ký tự; mô tả tối đa 360 ký tự.");
        require(
                slug != null
                        && slug.length() >= 3
                        && slug.length() <= 160
                        && slug.matches("[a-z0-9]+(?:-[a-z0-9]+)*"),
                "INVALID_SLUG",
                "Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch ngang.");
        require(
                !Set.of("admin", "api", "login", "new").contains(slug),
                "INVALID_SLUG",
                "Đường dẫn này được dành riêng cho hệ thống.");
        require(category != null && category.matches("[A-Z][A-Z0-9_]{2,39}"),
                "INVALID_CATEGORY", "Mã chuyên mục không hợp lệ.");
        require(document != null, "INVALID_DOCUMENT", "Vui lòng nhập nội dung.");
        require(coverAlt.length() <= 300, "INVALID_CONTENT", "Mô tả ảnh quá dài.");
        require(byline.length() <= 200, "INVALID_CONTENT", "Tên tác giả tối đa 200 ký tự.");
    }

    public void validateForPublication(Set<UUID> readyAssets) {
        require(title.length() >= 5, "PUBLICATION_INCOMPLETE", "Tiêu đề cần ít nhất 5 ký tự.");
        require(
                document.plainText().length() >= 20 || !document.assetIds().isEmpty(),
                "PUBLICATION_INCOMPLETE",
                "Nội dung cần ít nhất 20 ký tự hoặc một ảnh từ thư viện.");
        require(
                coverId == null || !coverAlt.isBlank(),
                "PUBLICATION_INCOMPLETE",
                "Vui lòng mô tả ảnh đại diện.");
        require(
                readyAssets.containsAll(assetIds()),
                "ASSET_NOT_READY",
                "Một ảnh chưa sẵn sàng để công khai.");
    }

    public Set<UUID> assetIds() {
        var ids = new HashSet<>(document.assetIds());
        if (coverId != null) ids.add(coverId);
        return Set.copyOf(ids);
    }

    public String displayAuthor(String publisherName) {
        if (!byline.isBlank()) return byline;
        if (origin != null && !origin.author().isBlank()) return origin.author();
        return publisherName == null ? "" : publisherName.strip();
    }
}
