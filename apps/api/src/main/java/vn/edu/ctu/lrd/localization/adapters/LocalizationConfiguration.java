package vn.edu.ctu.lrd.localization.adapters;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import vn.edu.ctu.lrd.localization.application.EnglishTranslationService;
import vn.edu.ctu.lrd.localization.application.port.EnglishTranslator;

@Configuration
public class LocalizationConfiguration {
    @Bean
    EnglishTranslationService englishTranslationService(EnglishTranslator translator) {
        return new EnglishTranslationService(translator);
    }
}
