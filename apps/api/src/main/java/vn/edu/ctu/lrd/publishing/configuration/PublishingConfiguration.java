package vn.edu.ctu.lrd.publishing.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import vn.edu.ctu.lrd.publishing.application.PublishingService;
import vn.edu.ctu.lrd.publishing.application.DocxImportService;
import vn.edu.ctu.lrd.publishing.application.CategoryService;
import vn.edu.ctu.lrd.publishing.application.port.*;
import vn.edu.ctu.lrd.media.api.MediaCatalog;
import vn.edu.ctu.lrd.sharedkernel.CategoryCatalog;

import java.time.Clock;

@Configuration
public class PublishingConfiguration {
    @Bean
    CategoryService categoryService(CategoryRepository repository) { return new CategoryService(repository); }

    @Bean
    PublishingService publishingService(
            ContentRepository repository, PublicationEffects effects, Clock clock, CategoryCatalog categories) {
        return new PublishingService(repository, effects, clock, categories);
    }

    @Bean
    DocxImportService docxImportService(PublishingService publishing, DocxReader reader, MediaCatalog media, ArticleComposer composer) {
        return new DocxImportService(publishing, reader, media, composer);
    }
}
