package vn.edu.ctu.lrd.media.application.port;

import vn.edu.ctu.lrd.media.domain.MediaAsset;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface AssetRepository {
    void insert(MediaAsset asset);

    MediaAsset get(UUID id);

    List<MediaAsset> list(UUID ownerOrNull, int page, int size, String query);

    boolean isPublic(UUID id);

    void replaceUsage(UUID source, Set<UUID> assets, boolean published);
}
