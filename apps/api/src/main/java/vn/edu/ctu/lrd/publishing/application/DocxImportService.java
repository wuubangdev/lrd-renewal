package vn.edu.ctu.lrd.publishing.application;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import vn.edu.ctu.lrd.media.api.MediaCatalog;
import vn.edu.ctu.lrd.publishing.application.port.DocxReader;
import vn.edu.ctu.lrd.publishing.application.port.ArticleComposer;
import vn.edu.ctu.lrd.publishing.domain.DocumentNode;
import vn.edu.ctu.lrd.publishing.domain.RichDocument;
import vn.edu.ctu.lrd.sharedkernel.Actor;

import java.util.Locale;
import java.util.UUID;
import java.util.HashMap;
import java.util.LinkedHashMap;

public class DocxImportService {
    private final PublishingService publishing;
    private final DocxReader reader;
    private final MediaCatalog media;
    private final ArticleComposer composer;

    public DocxImportService(PublishingService publishing, DocxReader reader, MediaCatalog media, ArticleComposer composer) {
        this.publishing = publishing;
        this.reader = reader;
        this.media = media;
        this.composer = composer;
    }

    public boolean aiAvailable() {
        return composer.available();
    }

    public DocxReader.Imported importFile(Actor actor, UUID entryId, String filename, byte[] bytes, boolean enhance) {
        publishing.get(actor, entryId);
        actor.require("media:upload");
        require(filename != null && filename.toLowerCase(Locale.ROOT).endsWith(".docx"),
                "INVALID_DOCX", "Vui lòng chọn tệp Word .docx.");
        require(bytes != null && bytes.length > 0 && bytes.length <= 15 * 1024 * 1024,
                "INVALID_DOCX", "Tệp Word phải có nội dung và không vượt quá 15 MB.");
        if (enhance) require(composer.available(), "AI_NOT_CONFIGURED", "Chưa cấu hình Gemini trong Cài đặt tích hợp.");
        var pending = new LinkedHashMap<UUID, PendingImage>();
        var result = reader.read(bytes, (name, image) -> {
            var id = UUID.randomUUID();
            pending.put(id, new PendingImage(name, image));
            return id;
        });
        new RichDocument(result.document());
        var title = result.title();
        var summary = result.summary();
        var document = result.document();
        if (enhance) {
            var plan = composer.compose(title, document);
            document = ArticleComposition.apply(document, plan);
            title = plan.title().strip();
            summary = plan.summary().strip();
            new RichDocument(document);
        }
        var resolved = new HashMap<UUID, UUID>();
        for (var item : pending.entrySet())
            resolved.put(item.getKey(), media.importImage(actor, item.getValue().name(), item.getValue().bytes()));
        document = resolveImages(document, resolved);
        new RichDocument(document);
        return new DocxReader.Imported(title, summary, document, result.imageCount(), result.warnings());
    }

    private static DocumentNode resolveImages(DocumentNode node, HashMap<UUID, UUID> ids) {
        var attrs = node.attrs();
        if ("image".equals(node.type()) || "inlineImage".equals(node.type())) {
            var oldId = UUID.fromString((String) attrs.get("assetId"));
            var replacement = ids.get(oldId);
            require(replacement != null, "INVALID_DOCX", "Ảnh trong tệp Word không hợp lệ.");
            var copy = new HashMap<>(attrs);
            copy.put("assetId", replacement.toString());
            attrs = copy;
        }
        return new DocumentNode(node.type(), node.content().stream().map(child -> resolveImages(child, ids)).toList(),
                node.text(), attrs, node.marks());
    }

    private record PendingImage(String name, byte[] bytes) {}
}
