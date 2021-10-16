package vn.edu.ctu.lrd.media.api;

import vn.edu.ctu.lrd.sharedkernel.Actor;

import java.util.Set;
import java.util.UUID;

public interface MediaCatalog {
    UUID importImage(Actor actor, String filename, byte[] bytes);

    Set<UUID> requireUsable(Set<UUID> ids, Actor actor);

    void replaceUsage(UUID source, Set<UUID> ids, boolean published);
}
