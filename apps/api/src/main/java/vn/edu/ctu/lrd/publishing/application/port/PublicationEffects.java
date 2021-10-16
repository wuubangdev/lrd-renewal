package vn.edu.ctu.lrd.publishing.application.port;

import vn.edu.ctu.lrd.publishing.domain.ContentEntry;
import vn.edu.ctu.lrd.sharedkernel.Actor;

import java.util.Set;
import java.util.UUID;

public interface PublicationEffects {
    Set<UUID> requireAssets(Set<UUID> ids, Actor actor);

    void syncDraftAssets(ContentEntry entry);

    void publish(ContentEntry entry, Actor actor);

    void withdraw(ContentEntry entry, Actor actor);

    void audit(String action, UUID entryId, Actor actor);
}
