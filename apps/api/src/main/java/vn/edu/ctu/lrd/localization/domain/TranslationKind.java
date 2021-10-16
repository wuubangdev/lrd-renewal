package vn.edu.ctu.lrd.localization.domain;

import vn.edu.ctu.lrd.sharedkernel.Actor;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

public enum TranslationKind {
    ARTICLE("content:create"), STAFF("directory:manage"), LABORATORY("directory:manage"),
    PROGRAM("academics:manage"), ADMISSION("academics:manage"), EDITORIAL("editorial:manage"),
    RESEARCH("research:manage"), HOME("site:manage"), MENU("site:manage");

    private final String permission;
    TranslationKind(String permission) { this.permission = permission; }
    public void authorize(Actor actor) { actor.require(permission); }
    public void requireLinkable() {
        DomainException.require(this != HOME && this != MENU, "INVALID_TRANSLATION_KIND",
                "Trang chủ và menu dùng phiên bản ngôn ngữ riêng, không tạo liên kết đối tượng.");
    }
    public static TranslationKind parse(String value) {
        try { return valueOf(value == null ? "" : value); }
        catch (IllegalArgumentException e) {
            throw new DomainException("INVALID_TRANSLATION_KIND", "Loại nội dung không được hỗ trợ.");
        }
    }
}
