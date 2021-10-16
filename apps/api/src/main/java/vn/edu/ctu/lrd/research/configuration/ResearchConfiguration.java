package vn.edu.ctu.lrd.research.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import vn.edu.ctu.lrd.research.application.ResearchService;
import vn.edu.ctu.lrd.research.application.port.ResearchRepository;
import vn.edu.ctu.lrd.directory.api.DirectoryCatalog;
import vn.edu.ctu.lrd.media.api.MediaCatalog;
import vn.edu.ctu.lrd.platform.api.AuditLog;
import java.time.Clock;

@Configuration
public class ResearchConfiguration {
    @Bean
    ResearchService researchService(ResearchRepository repository, DirectoryCatalog directory,
            MediaCatalog media, AuditLog audit, Clock clock) {
        return new ResearchService(repository, directory, media, audit, clock);
    }
}
