package vn.edu.ctu.lrd.media.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import java.time.Instant;
import java.util.UUID;

public record MediaAsset(
        UUID id,
        UUID ownerId,
        String name,
        String objectKey,
        String contentType,
        long size,
        int width,
        int height,
        String status,
        Instant createdAt) {
    public static MediaAsset ready(
            UUID id,
            UUID owner,
            String name,
            String key,
            String mime,
            long size,
            int width,
            int height,
            Instant now) {
        require(size > 0 && width > 0 && height > 0, "INVALID_IMAGE", "Ảnh không hợp lệ.");
        require(
                java.util.Set.of("image/jpeg", "image/png").contains(mime),
                "INVALID_IMAGE",
                "Chỉ hỗ trợ ảnh JPEG hoặc PNG.");
        return new MediaAsset(id, owner, name, key, mime, size, width, height, "READY", now);
    }

    public void requireReady() {
        require("READY".equals(status), "ASSET_NOT_READY", "Ảnh chưa sẵn sàng.");
    }
}
