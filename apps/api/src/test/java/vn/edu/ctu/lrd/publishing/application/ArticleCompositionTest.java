package vn.edu.ctu.lrd.publishing.application;

import org.junit.jupiter.api.Test;
import vn.edu.ctu.lrd.publishing.application.port.ArticleComposer;
import vn.edu.ctu.lrd.publishing.domain.DocumentNode;
import vn.edu.ctu.lrd.publishing.domain.RichDocument;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ArticleCompositionTest {
    @Test
    void insertsHeadingsAndKeepsOriginalBlocksAndImageReferences() {
        var first = paragraph("Mở đầu của bài viết");
        var imageId = UUID.randomUUID();
        var image = new DocumentNode("image", null, null,
                Map.of("assetId", imageId.toString(), "alt", "Ảnh nguồn"), null);
        var last = paragraph("Kết luận của bài viết");
        var source = new DocumentNode("doc", List.of(first, image, last), null, null, null);
        var plan = new ArticleComposer.Composition("Tiêu đề chuẩn", "Tóm tắt gọn",
                List.of(new ArticleComposer.Section(0, "Giới thiệu"),
                        new ArticleComposer.Section(2, "Kết luận")));
        var output = ArticleComposition.apply(source, plan);
        assertEquals(List.of("heading", "paragraph", "image", "heading", "paragraph"),
                output.content().stream().map(DocumentNode::type).toList());
        assertSame(image, output.content().get(2));
        assertEquals(imageId, new RichDocument(output).assetIds().iterator().next());
    }

    @Test
    void rejectsInvalidOrIncompleteOutline() {
        var source = new DocumentNode("doc", List.of(paragraph("Đoạn một"), paragraph("Đoạn hai")), null, null, null);
        assertThrows(DomainException.class, () -> ArticleComposition.apply(source,
                new ArticleComposer.Composition("Bài", "Tóm tắt", List.of(new ArticleComposer.Section(0, "Một")))));
        assertThrows(DomainException.class, () -> ArticleComposition.apply(source,
                new ArticleComposer.Composition("Bài", "Tóm tắt", List.of(
                        new ArticleComposer.Section(1, "Hai"), new ArticleComposer.Section(0, "Một")))));
    }

    private static DocumentNode paragraph(String text) {
        return new DocumentNode("paragraph", List.of(new DocumentNode("text", null, text, null, null)), null, null, null);
    }
}
