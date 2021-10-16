package vn.edu.ctu.lrd.publishing.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.net.URI;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

public record RichDocument(DocumentNode root) {
    private static final Set<String> TYPES =
            Set.of(
                    "doc",
                    "paragraph",
                    "text",
                    "heading",
                    "bulletList",
                    "orderedList",
                    "listItem",
                    "blockquote",
                    "hardBreak",
                    "horizontalRule",
                    "image",
                    "inlineImage",
                    "codeBlock",
                    "table",
                    "tableRow",
                    "tableCell",
                    "tableHeader");
    private static final Set<String> MARKS =
            Set.of(
                    "bold",
                    "italic",
                    "underline",
                    "strike",
                    "code",
                    "link",
                    "subscript",
                    "superscript");

    public RichDocument {
        require(
                root != null && "doc".equals(root.type()),
                "INVALID_DOCUMENT",
                "Nội dung bài viết không hợp lệ.");
        validate(root, 0, new int[] {0, 0});
    }

    private static void validate(DocumentNode node, int depth, int[] totals) {
        require(
                depth <= 30 && ++totals[0] <= 30000,
                "INVALID_DOCUMENT",
                "Nội dung vượt quá độ dài cho phép.");
        require(
                node.type() != null && TYPES.contains(node.type()),
                "INVALID_DOCUMENT",
                "Nội dung có thành phần không được hỗ trợ.");
        totals[1] += node.text() == null ? 0 : node.text().length();
        require(totals[1] <= 200000, "INVALID_DOCUMENT", "Nội dung vượt quá độ dài cho phép.");
        if ("heading".equals(node.type()))
            require(
                    node.attrs().get("level") instanceof Number n
                            && n.intValue() >= 2
                            && n.intValue() <= 6,
                    "INVALID_DOCUMENT",
                    "Chỉ sử dụng đề mục cấp 2 đến 6 trong bài.");
        if (node.attrs().containsKey("textAlign"))
            require(
                    Set.of("left", "center", "right", "justify")
                            .contains(node.attrs().get("textAlign")),
                    "INVALID_DOCUMENT",
                    "Căn lề không hợp lệ.");
        if ("table".equals(node.type()))
            require(
                    !node.content().isEmpty()
                            && node.content().size() <= 1000
                            && node.content().stream().allMatch(n -> "tableRow".equals(n.type())),
                    "INVALID_DOCUMENT",
                    "Bảng cần các hàng hợp lệ, tối đa 1000 hàng.");
        if ("tableRow".equals(node.type()))
            require(
                    !node.content().isEmpty()
                            && node.content().size() <= 100
                            && node.content().stream()
                                    .allMatch(
                                            n ->
                                                    Set.of("tableCell", "tableHeader")
                                                            .contains(n.type())),
                    "INVALID_DOCUMENT",
                    "Hàng cần các ô hợp lệ, tối đa 100 ô.");
        if (Set.of("tableCell", "tableHeader").contains(node.type())) {
            for (var attr : Set.of("colspan", "rowspan")) {
                var v = node.attrs().getOrDefault(attr, 1);
                require(
                        v instanceof Number n
                                && n.doubleValue() == n.intValue()
                                && n.intValue() >= 1
                                && n.intValue() <= 1000,
                        "INVALID_DOCUMENT",
                        "Kích thước ô gộp không hợp lệ.");
            }
            var widths = node.attrs().get("colwidth");
            require(
                    widths == null
                            || widths instanceof java.util.List<?> list
                                    && list.size() <= 100
                                    && list.stream()
                                            .allMatch(
                                                    w ->
                                                            w instanceof Number n
                                                                    && n.intValue() >= 0
                                                                    && n.intValue() <= 5000),
                    "INVALID_DOCUMENT",
                    "Độ rộng cột không hợp lệ.");
            require(!node.content().isEmpty(), "INVALID_DOCUMENT", "Ô bảng cần nội dung.");
        }
        if (Set.of("image", "inlineImage").contains(node.type())) {
            assetId(node);
            require(
                    node.attrs().get("alt") instanceof String alt
                            && !alt.isBlank()
                            && alt.length() <= 300,
                    "INVALID_DOCUMENT",
                    "Vui lòng mô tả ảnh.");
            require(
                    node.attrs().keySet().stream()
                            .allMatch(Set.of("assetId", "alt", "caption", "href")::contains),
                    "INVALID_DOCUMENT",
                    "Ảnh phải lấy từ thư viện media.");
            require(
                    !node.attrs().containsKey("caption")
                            || node.attrs().get("caption") instanceof String s
                                    && s.length() <= 2000,
                    "INVALID_DOCUMENT",
                    "Chú thích ảnh tối đa 2000 ký tự.");
            require(
                    !node.attrs().containsKey("href")
                            || node.attrs().get("href") instanceof String s
                                    && (s.isBlank() || safeLink(s)),
                    "INVALID_DOCUMENT",
                    "Liên kết ảnh không hợp lệ.");
        }
        if ("text".equals(node.type()))
            require(
                    node.text() != null && node.content().isEmpty(),
                    "INVALID_DOCUMENT",
                    "Đoạn văn bản không hợp lệ.");
        for (var mark : node.marks()) {
            require(
                    mark.type() != null && MARKS.contains(mark.type()),
                    "INVALID_DOCUMENT",
                    "Định dạng văn bản không được hỗ trợ.");
            if ("link".equals(mark.type()))
                require(
                        safeLink(mark.attrs().get("href")),
                        "INVALID_DOCUMENT",
                        "Đường dẫn không an toàn hoặc không hợp lệ.");
        }
        for (var child : node.content()) validate(child, depth + 1, totals);
    }

    public String plainText() {
        return plain(root).strip();
    }

    private static String plain(DocumentNode node) {
        return (node.text() == null ? "" : node.text())
                + node.content().stream()
                        .map(RichDocument::plain)
                        .collect(java.util.stream.Collectors.joining(" "));
    }

    public Set<UUID> assetIds() {
        var ids = new HashSet<UUID>();
        collect(root, ids);
        return Set.copyOf(ids);
    }

    private static void collect(DocumentNode node, Set<UUID> ids) {
        if (Set.of("image", "inlineImage").contains(node.type())) ids.add(assetId(node));
        node.content().forEach(c -> collect(c, ids));
    }

    private static UUID assetId(DocumentNode node) {
        try {
            return UUID.fromString((String) node.attrs().get("assetId"));
        } catch (Exception ex) {
            throw new DomainException("INVALID_DOCUMENT", "Ảnh chưa được tải lên thành công.");
        }
    }

    static boolean safeLink(Object value) {
        if (!(value instanceof String s)
                || s.length() > 2000
                || s.contains("\\")
                || s.chars().anyMatch(c -> c <= 32)) return false;
        if (s.startsWith("/") && !s.startsWith("//")) return true;
        try {
            var uri = URI.create(s);
            return Set.of("https", "http", "mailto", "tel")
                    .contains(
                            uri.getScheme() == null
                                    ? ""
                                    : uri.getScheme().toLowerCase(java.util.Locale.ROOT));
        } catch (Exception e) {
            return false;
        }
    }
}
