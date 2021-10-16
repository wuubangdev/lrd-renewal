package vn.edu.ctu.lrd.publishing.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import java.net.URI;
import java.time.LocalDate;

/** Editorial provenance belongs to the content snapshot, separately from publication audit time. */
public record ContentOrigin(
        String url, LocalDate publishedOn, String author, LocalDate retrievedOn) {
    public ContentOrigin {
        require(
                RichDocument.safeLink(url)
                        && url.startsWith("https://")
                        && URI.create(url).getHost() != null,
                "INVALID_ORIGIN",
                "Nguồn bài viết phải là URL HTTPS.");
        author = author == null ? "" : author.strip();
        require(
                author.length() <= 200
                        && retrievedOn != null
                        && (publishedOn == null || !publishedOn.isAfter(retrievedOn)),
                "INVALID_ORIGIN",
                "Tác giả hoặc ngày nguồn không hợp lệ.");
    }
}
