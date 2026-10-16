package vn.edu.ctu.lrd.localization.application;

import vn.edu.ctu.lrd.localization.application.port.EnglishTranslator;
import vn.edu.ctu.lrd.localization.domain.TranslationFields;
import vn.edu.ctu.lrd.sharedkernel.DomainException;
import java.util.*;

public class EnglishTranslationService {
    private final EnglishTranslator translator;
    public EnglishTranslationService(EnglishTranslator translator) { this.translator = translator; }

    public Map<String, Object> translate(String kind, Map<String, Object> source) {
        if (!Set.of("ARTICLE", "STAFF", "LABORATORY", "PROGRAM", "ADMISSION",
                "EDITORIAL", "RESEARCH", "HOME", "MENU").contains(kind))
            throw new DomainException("INVALID_TRANSLATION_KIND", "Loại nội dung không được hỗ trợ.");
        var fields = TranslationFields.collect(kind, source);
        var results = new ArrayList<String>();
        var batch = new ArrayList<String>();
        int length = 0;
        for (var field : fields) {
            if (!batch.isEmpty() && (batch.size() >= 40 || length + field.length() > 8000)) {
                var translated = translator.translate(batch);
                if (translated == null || translated.size() != batch.size())
                    throw new DomainException("AI_INVALID_RESPONSE", "Gemini trả về số trường không khớp.");
                results.addAll(translated);
                batch.clear();
                length = 0;
            }
            batch.add(field);
            length += field.length();
        }
        if (!batch.isEmpty()) {
            var translated = translator.translate(batch);
            if (translated == null || translated.size() != batch.size())
                throw new DomainException("AI_INVALID_RESPONSE", "Gemini trả về số trường không khớp.");
            results.addAll(translated);
        }
        return TranslationFields.apply(kind, source, results);
    }
}
