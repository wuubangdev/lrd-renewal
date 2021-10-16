package vn.edu.ctu.lrd.site.application.port;

import vn.edu.ctu.lrd.sharedkernel.Actor;
import vn.edu.ctu.lrd.site.domain.*;

import java.util.UUID;

public interface SiteEffects {
    void validateReferences(SiteDocument document, Actor actor);

    void trackDraft(SiteDocument document, Actor actor);

    void trackPublication(SiteDocument document);

    void audit(Actor actor, String action, UUID id);
}
