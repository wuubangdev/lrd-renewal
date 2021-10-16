package vn.edu.ctu.lrd.publishing.adapters.out.docx;

import org.apache.poi.xwpf.usermodel.*;
import org.springframework.stereotype.Component;
import vn.edu.ctu.lrd.publishing.application.port.DocxReader;
import vn.edu.ctu.lrd.publishing.domain.DocumentNode;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Component
public class PoiDocxReader implements DocxReader {
    private static final int MAX_IMAGES = 30;
    private static final int MAX_IMAGE_BYTES = 8 * 1024 * 1024;

    @Override
    public Imported read(byte[] bytes, ImageSink images) {
        try (var document = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            var state = new State(document, images);
            for (var element : document.getBodyElements()) {
                if (element instanceof XWPFParagraph paragraph) state.add(paragraph);
                else if (element instanceof XWPFTable table) state.add(table);
            }
            state.finishList();
            if (state.title.isBlank() && state.blocks.isEmpty())
                throw new DomainException("INVALID_DOCX", "Tệp Word không có nội dung bài viết.");
            if (state.title.isBlank()) state.title = "Bài viết nhập từ Word";
            if (state.blocks.isEmpty()) state.blocks.add(node("paragraph", List.of()));
            return new Imported(state.title, state.summary, node("doc", state.blocks), state.imageCount, List.copyOf(state.warnings));
        } catch (DomainException e) {
            throw e;
        } catch (Exception e) {
            throw new DomainException("INVALID_DOCX", "Không thể đọc tệp Word. Vui lòng dùng tệp .docx hợp lệ.");
        }
    }

    private static final class State {
        final XWPFDocument document;
        final ImageSink images;
        final List<DocumentNode> blocks = new ArrayList<>();
        final List<String> warnings = new ArrayList<>();
        final List<DocumentNode> listItems = new ArrayList<>();
        String listType = "";
        String title = "";
        String summary = "";
        int imageCount;

        State(XWPFDocument document, ImageSink images) {
            this.document = document;
            this.images = images;
        }

        void add(XWPFParagraph paragraph) {
            var raw = paragraph.getText().strip();
            var style = paragraph.getStyle() == null ? "" : paragraph.getStyle().toLowerCase(Locale.ROOT);
            if (title.isBlank() && !raw.isBlank() && (style.contains("title") || style.contains("heading1") || blocks.isEmpty())) {
                title = raw.length() <= 200 ? raw : raw.substring(0, 200);
                return;
            }
            var inline = new ArrayList<DocumentNode>();
            var pictures = new ArrayList<DocumentNode>();
            for (var run : paragraph.getRuns()) {
                String value = run.text();
                if (value != null && !value.isEmpty()) {
                    var marks = new ArrayList<DocumentNode.Mark>();
                    if (run.isBold()) marks.add(new DocumentNode.Mark("bold", null));
                    if (run.isItalic()) marks.add(new DocumentNode.Mark("italic", null));
                    if (run.getUnderline() != UnderlinePatterns.NONE) marks.add(new DocumentNode.Mark("underline", null));
                    if (run.isStrikeThrough()) marks.add(new DocumentNode.Mark("strike", null));
                    if (run instanceof XWPFHyperlinkRun link) {
                        var target = link.getHyperlink(document);
                        if (target != null && target.getURL() != null && target.getURL().matches("(?i)^(https?://|mailto:|tel:)[^\\s]+$"))
                            marks.add(new DocumentNode.Mark("link", Map.of("href", target.getURL())));
                    }
                    inline.add(new DocumentNode("text", null, value, null, marks));
                }
                for (var picture : run.getEmbeddedPictures()) {
                    var data = picture.getPictureData();
                    if (data == null) continue;
                    var mime = data.getPackagePart().getContentType();
                    var imageBytes = data.getData();
                    if (!(mime.equals("image/png") || mime.equals("image/jpeg")) || imageBytes.length > MAX_IMAGE_BYTES || imageCount >= MAX_IMAGES) {
                        warnings.add("Một ảnh không hỗ trợ định dạng PNG/JPEG, vượt quá 8 MB hoặc quá giới hạn 30 ảnh đã được bỏ qua.");
                        continue;
                    }
                    UUID id = images.store(data.getFileName(), imageBytes);
                    imageCount++;
                    var attrs = Map.<String, Object>of("assetId", id.toString(), "alt", "Hình minh họa từ tệp Word " + imageCount);
                    pictures.add(new DocumentNode("image", null, null, attrs, null));
                }
            }
            if (summary.isBlank() && !raw.isBlank() && !style.contains("heading"))
                summary = raw.length() <= 360 ? raw : raw.substring(0, 360);
            if (paragraph.getNumID() != null) {
                var type = "bulletList";
                try {
                    var format = paragraph.getNumFmt();
                    if (format != null && !format.equalsIgnoreCase("bullet")) type = "orderedList";
                } catch (Exception ignored) { /* Keep a readable bullet list when Word numbering is incomplete. */ }
                if (!listType.isEmpty() && !listType.equals(type)) finishList();
                listType = type;
                listItems.add(node("listItem", List.of(node("paragraph", inline))));
            } else {
                finishList();
                if (!inline.isEmpty()) {
                    int level = headingLevel(style);
                    blocks.add(level > 0
                            ? new DocumentNode("heading", inline, null, Map.of("level", level), null)
                            : node("paragraph", inline));
                }
            }
            blocks.addAll(pictures);
        }

        void add(XWPFTable table) {
            finishList();
            var rows = new ArrayList<DocumentNode>();
            for (var row : table.getRows()) {
                var cells = new ArrayList<DocumentNode>();
                for (var cell : row.getTableCells()) {
                    var paragraphs = new ArrayList<DocumentNode>();
                    for (var paragraph : cell.getParagraphs()) {
                        var text = paragraph.getText();
                        paragraphs.add(node("paragraph", text.isEmpty() ? List.of() : List.of(new DocumentNode("text", null, text, null, null))));
                    }
                    if (paragraphs.isEmpty()) paragraphs.add(node("paragraph", List.of()));
                    cells.add(node("tableCell", paragraphs));
                }
                if (!cells.isEmpty()) rows.add(node("tableRow", cells));
            }
            if (!rows.isEmpty()) blocks.add(node("table", rows));
        }

        void finishList() {
            if (!listItems.isEmpty()) blocks.add(node(listType, List.copyOf(listItems)));
            listItems.clear();
            listType = "";
        }
    }

    private static int headingLevel(String style) {
        var match = java.util.regex.Pattern.compile("heading\\s*([1-6])").matcher(style);
        return match.find() ? Math.max(2, Integer.parseInt(match.group(1))) : 0;
    }

    private static DocumentNode node(String type, List<DocumentNode> content) {
        return new DocumentNode(type, content, null, null, null);
    }
}
