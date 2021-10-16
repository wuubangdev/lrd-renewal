package vn.edu.ctu.lrd.directory.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import java.util.UUID;

public record LabEquipment(String name, String quantity, String description, UUID imageId, String imageAlt) {
    public LabEquipment {
        name = LabContent.clean(name); quantity = LabContent.clean(quantity);
        description = LabContent.clean(description); imageAlt = LabContent.clean(imageAlt);
        require(name.length() <= 300 && quantity.length() <= 80 && description.length() <= 2000
                        && imageAlt.length() <= 300, "INVALID_LAB", "Thông tin thiết bị vượt giới hạn.");
        require(imageId == null || !imageAlt.isBlank(), "INVALID_LAB", "Ảnh thiết bị cần mô tả.");
    }
}
