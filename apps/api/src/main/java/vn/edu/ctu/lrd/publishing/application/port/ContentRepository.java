package vn.edu.ctu.lrd.publishing.application.port;

import vn.edu.ctu.lrd.publishing.domain.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ContentRepository {
    ContentEntry get(UUID id);

    ContentEntry insert(ContentEntry entry);

    ContentEntry save(ContentEntry entry);

    List<ContentEntry> list(UUID ownerOrNull, int page, int size, String query, String category, String status);

    long count(UUID ownerOrNull, String query, String category, String status);

    List<Publication> revisions(UUID entryId);

    Publication revision(UUID entryId, UUID revisionId);

    Optional<Publication> retry(UUID actorId, String key, UUID entryId, long draftVersion);

    void remember(UUID actorId, String key, Publication publication);
}
