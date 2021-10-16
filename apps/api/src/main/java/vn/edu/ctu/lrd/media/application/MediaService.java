package vn.edu.ctu.lrd.media.application;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import vn.edu.ctu.lrd.media.application.port.*;
import vn.edu.ctu.lrd.media.domain.MediaAsset;
import vn.edu.ctu.lrd.sharedkernel.Actor;

import java.time.Clock;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public class MediaService {
    private final AssetRepository assets;
    private final ObjectStorage storage;
    private final ImageProcessor images;
    private final Clock clock;

    public record Download(MediaAsset asset, byte[] bytes) {}

    public MediaService(
            AssetRepository assets, ObjectStorage storage, ImageProcessor images, Clock clock) {
        this.assets = assets;
        this.storage = storage;
        this.images = images;
        this.clock = clock;
    }

    public MediaAsset upload(Actor actor, String filename, byte[] input) {
        actor.require("media:upload");
        require(input.length <= 8 * 1024 * 1024, "FILE_TOO_LARGE", "Ảnh vượt quá 8 MB.");
        var image = images.process(input);
        var id = UUID.randomUUID();
        var key = "images/" + id + "." + image.extension();
        var name = filename == null ? "image" : filename.replaceAll("[\\p{Cntrl}\\\\/]", "_");
        if (name.length() > 240) name = name.substring(name.length() - 240);
        var asset =
                MediaAsset.ready(
                        id,
                        actor.id(),
                        name,
                        key,
                        image.contentType(),
                        image.bytes().length,
                        image.width(),
                        image.height(),
                        clock.instant());
        storage.put(key, image.contentType(), image.bytes());
        try {
            assets.insert(asset);
        } catch (RuntimeException ex) {
            try {
                storage.delete(key);
            } catch (RuntimeException ignored) {
            }
            throw ex;
        }
        return asset;
    }

    public List<MediaAsset> list(Actor actor) {
        return list(actor, 0, 60, "");
    }

    public List<MediaAsset> list(Actor actor, int page, int size, String query) {
        actor.require("media:upload");
        require(
                page >= 0
                        && page <= 100000
                        && size >= 1
                        && size <= 60
                        && query != null
                        && query.length() <= 200,
                "INVALID_QUERY",
                "Phân trang hoặc tìm kiếm ảnh không hợp lệ.");
        return assets.list(actor.can("media:manage") ? null : actor.id(), page, size, query);
    }

    public Set<UUID> requireAssets(Set<UUID> ids, Actor actor) {
        for (var id : ids) {
            var asset = assets.get(id);
            authorize(asset, actor);
            asset.requireReady();
        }
        return Set.copyOf(ids);
    }

    public Download privateDownload(UUID id, Actor actor) {
        var asset = assets.get(id);
        authorize(asset, actor);
        return new Download(asset, storage.get(asset.objectKey()));
    }

    public Download publicDownload(UUID id) {
        require(assets.isPublic(id), "NOT_FOUND", "Không tìm thấy ảnh.");
        var asset = assets.get(id);
        return new Download(asset, storage.get(asset.objectKey()));
    }

    private void authorize(MediaAsset asset, Actor actor) {
        require(
                asset.ownerId().equals(actor.id()) || actor.can("media:manage"),
                "FORBIDDEN",
                "Bạn không có quyền sử dụng ảnh này.");
    }
}
