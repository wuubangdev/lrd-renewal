package vn.edu.ctu.lrd.site.application.port;

import vn.edu.ctu.lrd.site.domain.*;

import java.util.*;

public interface SiteRepository {
    Optional<SiteDocument> find(SiteDocument.Kind kind, String locale);

    void save(SiteDocument document, long expected);

    List<SiteDocument.Release> history(UUID documentId);

    Optional<SiteDocument.Release> release(UUID documentId, UUID releaseId);
}
