package vn.edu.ctu.lrd.localization.domain;

import java.util.UUID;
import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

public record TranslationLink(TranslationKind kind, UUID sourceId, UUID targetId) {
    public TranslationLink {
        require(kind != null && sourceId != null && targetId != null && !sourceId.equals(targetId),
                "INVALID_TRANSLATION_LINK", "Liên kết bản dịch không hợp lệ.");
        kind.requireLinkable();
    }
}
