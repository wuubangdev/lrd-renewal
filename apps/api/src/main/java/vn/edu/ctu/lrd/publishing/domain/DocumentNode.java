package vn.edu.ctu.lrd.publishing.domain;

import java.util.List;
import java.util.Map;

public record DocumentNode(
        String type,
        List<DocumentNode> content,
        String text,
        Map<String, Object> attrs,
        List<Mark> marks) {
    public DocumentNode {
        content = content == null ? List.of() : List.copyOf(content);
        attrs = attrs == null ? Map.of() : Map.copyOf(attrs);
        marks = marks == null ? List.of() : List.copyOf(marks);
    }

    public record Mark(String type, Map<String, Object> attrs) {
        public Mark {
            attrs = attrs == null ? Map.of() : Map.copyOf(attrs);
        }
    }

    public static DocumentNode empty() {
        return new DocumentNode(
                "doc",
                List.of(new DocumentNode("paragraph", null, null, null, null)),
                null,
                null,
                null);
    }
}
