package vn.edu.ctu.lrd.localization.domain;

import java.util.UUID;
import vn.edu.ctu.lrd.sharedkernel.Actor;
import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

public record TranslationResource(UUID id, String locale, String subtype, UUID ownerId) {
    public void requireEditableBy(Actor actor) {
        if (ownerId != null) require(actor.can("content:update:any")
                        || (ownerId.equals(actor.id()) && actor.can("content:update:own")),
                "FORBIDDEN", "Bạn không có quyền liên kết bản dịch của bài viết này.");
    }
    public void requireEnglishVersionOf(TranslationResource source) {
        require("vi".equals(source.locale) && "en".equals(locale) && !id.equals(source.id)
                        && subtype.equals(source.subtype),
                "INVALID_TRANSLATION_LINK", "Nguồn phải là tiếng Việt, đích là tiếng Anh và cùng loại đối tượng.");
    }
}
