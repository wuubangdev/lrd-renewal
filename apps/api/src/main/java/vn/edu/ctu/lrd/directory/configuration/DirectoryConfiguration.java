package vn.edu.ctu.lrd.directory.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import vn.edu.ctu.lrd.directory.application.StaffService;
import vn.edu.ctu.lrd.directory.application.port.StaffRepository;
import vn.edu.ctu.lrd.directory.application.LaboratoryService;
import vn.edu.ctu.lrd.directory.application.port.LaboratoryRepository;
import vn.edu.ctu.lrd.media.api.MediaCatalog;
import vn.edu.ctu.lrd.platform.api.AuditLog;
import java.time.Clock;

@Configuration
public class DirectoryConfiguration {
    @Bean
    StaffService staffService(StaffRepository repository, MediaCatalog media, AuditLog audit, Clock clock) {
        return new StaffService(repository, media, audit, clock);
    }
    @Bean
    LaboratoryService laboratoryService(LaboratoryRepository repository, MediaCatalog media, AuditLog audit, Clock clock) {
        return new LaboratoryService(repository, media, audit, clock);
    }
}
