package vn.edu.ctu.lrd.editorial.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import vn.edu.ctu.lrd.editorial.application.EditorialService;
import vn.edu.ctu.lrd.editorial.application.port.EditorialRepository;
import vn.edu.ctu.lrd.discovery.api.SearchCatalog;
import vn.edu.ctu.lrd.media.api.MediaCatalog;
import vn.edu.ctu.lrd.platform.api.AuditLog;
import java.time.Clock;

@Configuration
public class EditorialConfiguration {
    @Bean
    EditorialService editorialService(EditorialRepository repository, SearchCatalog search,
            MediaCatalog media, AuditLog audit, Clock clock) {
        return new EditorialService(repository, search, media, audit, clock);
    }
}
