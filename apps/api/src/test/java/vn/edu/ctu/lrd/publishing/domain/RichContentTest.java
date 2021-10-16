package vn.edu.ctu.lrd.publishing.domain;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;

import vn.edu.ctu.lrd.sharedkernel.Actor;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.time.*;
import java.util.*;

class RichContentTest {
    private DocumentNode node(String type, Map<String, Object> attrs, DocumentNode... children) {
        return new DocumentNode(type, List.of(children), null, attrs, null);
    }

    private DocumentNode paragraph() {
        return node(
                "paragraph",
                Map.of("textAlign", "justify"),
                new DocumentNode(
                        "text",
                        null,
                        "Nội dung toàn văn được giữ trong ô bảng.",
                        null,
                        List.of(new DocumentNode.Mark("superscript", null))));
    }

    @Test
    void tablesAndImageOnlyArticlesRetainAssetsAndProvenanceAcrossPublicationAndRestore() {
        var id = UUID.randomUUID();
        var image =
                node(
                        "image",
                        Map.of(
                                "assetId",
                                id.toString(),
                                "alt",
                                "Ảnh gốc",
                                "caption",
                                "Chú thích gốc",
                                "href",
                                "https://ctu.edu.vn/"));
        var document =
                new RichDocument(
                        node(
                                "doc",
                                null,
                                node(
                                        "table",
                                        null,
                                        node(
                                                "tableRow",
                                                null,
                                                node(
                                                        "tableHeader",
                                                        Map.of("colspan", 2, "rowspan", 1),
                                                        paragraph(),
                                                        image)))));
        assertThat(document.assetIds()).containsExactly(id);
        assertThat(document.plainText()).contains("Nội dung toàn văn");
        var origin =
                new ContentOrigin(
                        "https://lrd.ctu.edu.vn/bai-goc.html",
                        LocalDate.of(2021, 10, 1),
                        "Tác giả nguồn",
                        LocalDate.of(2026, 10, 15));
        var draft =
                new ContentDraft(
                        "Bài đầy đủ từ nguồn",
                        "bai-day-du",
                        "",
                        "TIN_TUC",
                        document,
                        null,
                        "",
                        origin);
        var now = Instant.parse("2026-10-15T00:00:00Z");
        var actor = new Actor(UUID.randomUUID(), "Editor", Set.of("content:create"));
        var entry = ContentEntry.create(actor, "vi", now);
        entry.revise(0, draft, now);
        var first = entry.publish(0, entry.draftVersion(), Set.of(id), actor, now);
        entry.revise(
                0,
                new ContentDraft(
                        "Bài chỉ chứa ảnh",
                        "anh-goc",
                        "",
                        "TIN_TUC",
                        new RichDocument(node("doc", null, image)),
                        null,
                        ""),
                now);
        entry.publish(0, entry.draftVersion(), Set.of(id), actor, now);
        entry.restore(0, first, now);
        assertThat(entry.draft().origin()).isEqualTo(origin);
        assertThat(first.publishedAt()).isEqualTo(now);
        assertThat(entry.draft().document()).isEqualTo(document);
    }

    @Test
    void rejectsUnsafeImageLinksInvalidSpansAndInvalidProvenance() {
        var id = UUID.randomUUID().toString();
        assertThatThrownBy(
                        () ->
                                new RichDocument(
                                        node(
                                                "doc",
                                                null,
                                                node(
                                                        "image",
                                                        Map.of(
                                                                "assetId",
                                                                id,
                                                                "alt",
                                                                "x",
                                                                "href",
                                                                "javascript:alert(1)")))))
                .isInstanceOf(DomainException.class);
        assertThatThrownBy(
                        () -> new RichDocument(node("doc", null, node("table", null, paragraph()))))
                .isInstanceOf(DomainException.class);
        assertThatThrownBy(
                        () ->
                                new RichDocument(
                                        node(
                                                "doc",
                                                null,
                                                node(
                                                        "tableCell",
                                                        Map.of("rowspan", 0),
                                                        paragraph()))))
                .isInstanceOf(DomainException.class);
        assertThatThrownBy(
                        () ->
                                new ContentOrigin(
                                        "https://lrd.ctu.edu.vn/x",
                                        LocalDate.of(2026, 10, 16),
                                        "",
                                        LocalDate.of(2026, 10, 15)))
                .isInstanceOf(DomainException.class);
        assertThatThrownBy(
                        () ->
                                new ContentOrigin(
                                        "javascript:alert(1)",
                                        null,
                                        "",
                                        LocalDate.of(2026, 10, 15)))
                .isInstanceOf(DomainException.class);
    }
}
