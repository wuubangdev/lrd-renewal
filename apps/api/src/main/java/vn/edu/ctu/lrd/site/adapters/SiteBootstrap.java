package vn.edu.ctu.lrd.site.adapters;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.ctu.lrd.site.domain.*;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;

@Component
public class SiteBootstrap implements ApplicationRunner {
    private final SitePersistence repository;

    public SiteBootstrap(SitePersistence repository) {
        this.repository = repository;
    }

    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        for (var kind : SiteDocument.Kind.values()) {
            for (String locale : new String[] {"vi", "en"}) {
                var resource = new ClassPathResource("site/" + kind.name().toLowerCase(java.util.Locale.ROOT)
                        + (locale.equals("en") ? ".en" : "") + ".json");
                String source = resource.getContentAsString(StandardCharsets.UTF_8);
                var content = repository.decode(source, kind);
                var existing = repository.find(kind, locale);
                if (existing.isPresent()) {
                    var current = existing.get();
                    // Earlier installations seeded an unpublished English copy of the Vietnamese
                    // defaults. Upgrade only that untouched copy; preserve any editor changes.
                    if (locale.equals("en") && current.live() == null
                            && current.version() == 0 && current.draftVersion() == 1) {
                        var revised = current.revise(content, 0, Instant.now());
                        repository.save(revised, 0);
                        repository.save(revised.publish(revised.version(), revised.draftVersion(), null,
                                Instant.now()), revised.version());
                    }
                    continue;
                }
                var d =
                        new SiteDocument(
                                UUID.randomUUID(),
                                kind,
                                locale,
                                content,
                                1,
                                0,
                                null,
                                Instant.now());
                d = d.publish(0, 1, null, Instant.now());
                repository.initialize(d);
            }
        }
    }
}
