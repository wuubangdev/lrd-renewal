package vn.edu.ctu.lrd.publishing.application;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import vn.edu.ctu.lrd.publishing.application.port.ArticleComposer;
import vn.edu.ctu.lrd.publishing.domain.DocumentNode;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Applies a verified outline without letting generated text replace source facts or media. */
public final class ArticleComposition {
    private ArticleComposition() {}

    public static DocumentNode apply(DocumentNode source, ArticleComposer.Composition plan) {
        require(plan != null && plan.title() != null && !plan.title().isBlank()
                        && plan.title().length() <= 200 && plan.summary() != null
                        && plan.summary().length() <= 360 && plan.sections() != null
                        && plan.sections().size() <= 12,
                "AI_INVALID_RESPONSE", "Gemini chưa tạo được bố cục bài viết hợp lệ.");
        var original = source.content();
        var result = new ArrayList<DocumentNode>();
        int previous = -1;
        for (var section : plan.sections()) {
            require(section != null && section.beforeIndex() > previous
                            && section.beforeIndex() >= 0 && section.beforeIndex() < original.size()
                            && section.heading() != null && !section.heading().isBlank()
                            && section.heading().length() <= 120,
                    "AI_INVALID_RESPONSE", "Gemini trả về vị trí đề mục không hợp lệ.");
            previous = section.beforeIndex();
        }
        long existing = original.stream().filter(node -> "heading".equals(node.type())).count();
        long additions = plan.sections().stream()
                .filter(section -> !"heading".equals(original.get(section.beforeIndex()).type())).count();
        require(original.size() < 2 || existing + additions >= 2,
                "AI_INVALID_RESPONSE", "Gemini chưa tạo đủ đề mục cho mục lục.");
        int cursor = 0;
        for (int i = 0; i < original.size(); i++) {
            if (cursor < plan.sections().size() && plan.sections().get(cursor).beforeIndex() == i) {
                var heading = new DocumentNode("text", null, plan.sections().get(cursor++).heading().strip(), null, null);
                if (!"heading".equals(original.get(i).type()))
                    result.add(new DocumentNode("heading", List.of(heading), null, Map.of("level", 2), null));
            }
            result.add(original.get(i));
        }
        return new DocumentNode("doc", result, null, null, null);
    }
}
