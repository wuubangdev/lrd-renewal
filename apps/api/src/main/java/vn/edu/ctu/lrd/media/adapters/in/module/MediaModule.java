package vn.edu.ctu.lrd.media.adapters.in.module;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.ctu.lrd.media.api.MediaCatalog;
import vn.edu.ctu.lrd.media.application.MediaService;
import vn.edu.ctu.lrd.media.application.port.AssetRepository;
import vn.edu.ctu.lrd.sharedkernel.Actor;

import java.util.Set;
import java.util.UUID;

@Service
@Transactional(propagation = Propagation.MANDATORY)
public class MediaModule implements MediaCatalog {
    private final MediaService service;
    private final AssetRepository assets;

    public MediaModule(MediaService service, AssetRepository assets) {
        this.service = service;
        this.assets = assets;
    }

    public Set<UUID> requireUsable(Set<UUID> ids, Actor actor) {
        return service.requireAssets(ids, actor);
    }

    public UUID importImage(Actor actor, String filename, byte[] bytes) {
        return service.upload(actor, filename, bytes).id();
    }

    public void replaceUsage(UUID source, Set<UUID> ids, boolean published) {
        assets.replaceUsage(source, ids, published);
    }
}
