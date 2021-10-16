package vn.edu.ctu.lrd.directory.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import java.util.List;

public record StaffSection(String title, List<StaffBlock> blocks) {
    public StaffSection {
        title = title == null ? "" : title.strip();
        blocks = blocks == null ? List.of() : List.copyOf(blocks);
        require(!title.isBlank() && title.length() <= 160 && blocks.size() <= 100,
                "INVALID_STAFF", "Đề mục hồ sơ không hợp lệ.");
    }
}
