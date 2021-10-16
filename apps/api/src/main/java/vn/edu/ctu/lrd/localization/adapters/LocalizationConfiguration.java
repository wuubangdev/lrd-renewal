package vn.edu.ctu.lrd.localization.adapters;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import vn.edu.ctu.lrd.localization.application.EnglishTranslationService;
import vn.edu.ctu.lrd.localization.application.port.EnglishTranslator;
import vn.edu.ctu.lrd.localization.application.TranslationLinkService;
import vn.edu.ctu.lrd.localization.application.port.TranslationLinks;
import vn.edu.ctu.lrd.localization.application.port.TranslationResources;

@Configuration
public class LocalizationConfiguration {
    @Bean
    TranslationLinkService translationLinkService(TranslationResources resources, TranslationLinks links) {
        return new TranslationLinkService(resources, links);
    }
    @Bean
    EnglishTranslationService englishTranslationService(EnglishTranslator translator) {
        return new EnglishTranslationService(translator);
    }
}
