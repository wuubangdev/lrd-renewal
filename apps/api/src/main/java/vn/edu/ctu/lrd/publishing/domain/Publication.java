package vn.edu.ctu.lrd.publishing.domain;

import java.time.Instant;
import java.util.UUID;

public record Publication(
        UUID id,
        UUID entryId,
        long draftVersion,
        ContentDraft snapshot,
        Instant publishedAt,
        UUID publishedBy,
        String authorName) {}
