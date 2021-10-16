package vn.edu.ctu.lrd.localization;

import org.junit.jupiter.api.Test;
import vn.edu.ctu.lrd.localization.application.EnglishTranslationService;
import vn.edu.ctu.lrd.localization.domain.TranslationFields;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class EnglishTranslationServiceTest {
    @Test
    void translatesNestedEditorialTextWithoutChangingIdentifiersOrLinks() {
        var source = new LinkedHashMap<String, Object>();
        source.put("title", "Hội thảo khoa học");
        source.put("slug", "hoi-thao-khoa-hoc");
        source.put("articleId", "a9b4f948-8370-4a98-a758-6506d7cc0148");
        source.put("venue", "Đại học Cần Thơ");
        source.put("blocks", List.of(Map.of("kind", "TEXT", "text", "Thảo luận về tài nguyên đất đai")));
        source.put("registrationUrl", "https://example.org/register");
        var fields = TranslationFields.collect("EDITORIAL", source);
        assertEquals(List.of("Hội thảo khoa học", "Đại học Cần Thơ",
                "Thảo luận về tài nguyên đất đai"), fields);
        var service = new EnglishTranslationService(input -> input.stream().map(text -> "EN: " + text).toList());
        var result = service.translate("EDITORIAL", source);
        assertEquals("EN: Hội thảo khoa học", result.get("title"));
        assertEquals(source.get("articleId"), result.get("articleId"));
        assertEquals(source.get("registrationUrl"), result.get("registrationUrl"));
        assertEquals(source.get("slug"), result.get("slug"));
        assertEquals("Hội thảo khoa học", source.get("title"));
    }

    @Test
    void rejectsIncompleteAiResponseBeforeWritingAnyDraft() {
        var service = new EnglishTranslationService(input -> List.of());
        assertThrows(DomainException.class,
                () -> service.translate("ARTICLE", Map.of("title", "Bài viết")));
    }

    @Test
    void preservesStaffIdentityAndPrivateFields() {
        var source = Map.<String, Object>of("name", "Nguyễn Văn A", "summary", "Nghiên cứu đất đai",
                "privateNotes", "Ghi chú nội bộ", "email", "person@ctu.edu.vn");
        var translated = new EnglishTranslationService(input -> input.stream().map(s -> "EN: " + s).toList())
                .translate("STAFF", source);
        assertEquals("Nguyễn Văn A", translated.get("name"));
        assertEquals("Ghi chú nội bộ", translated.get("privateNotes"));
        assertEquals("EN: Nghiên cứu đất đai", translated.get("summary"));
        assertEquals("person@ctu.edu.vn", translated.get("email"));
    }

    @Test
    void excludesPrivateSubtreesAndMachineAttributesFromAiRequests() {
        var source = Map.<String, Object>of("summary", "Nghiên cứu đất đai",
                "sourceArticleId", UUID.randomUUID().toString(),
                "privateFacts", List.of(Map.of("label", "Địa chỉ riêng", "value", "Không gửi ra ngoài")),
                "document", Map.of("type", "doc", "content", List.of(Map.of("type", "paragraph",
                        "attrs", Map.of("textAlign", "justify"), "content", List.of(Map.of("type", "text", "text", "Nội dung"))))));
        var captured = new ArrayList<String>();
        var translated = new EnglishTranslationService(input -> {
            captured.addAll(input);
            return input.stream().map(s -> "EN: " + s).toList();
        }).translate("STAFF", source);
        assertEquals(Set.of("Nghiên cứu đất đai", "Nội dung"), new HashSet<>(captured));
        assertEquals(source.get("privateFacts"), translated.get("privateFacts"));
        assertEquals(source.get("sourceArticleId"), translated.get("sourceArticleId"));
        assertTrue(translated.get("document").toString().contains("textAlign=justify"));
    }
}
