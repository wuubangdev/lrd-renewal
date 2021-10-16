package vn.edu.ctu.lrd.directory.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import java.util.List;
import java.util.UUID;

public record StaffBlock(Kind kind, String text, String value, List<String> items, List<List<String>> rows,
                         UUID assetId, String alt) {
    public enum Kind { TEXT, FACT, LIST, TABLE, IMAGE }
    public StaffBlock {
        require(kind != null, "INVALID_STAFF", "Loại nội dung hồ sơ không hợp lệ.");
        text = text == null ? "" : text.strip();
        value = value == null ? "" : value.strip();
        alt = alt == null ? "" : alt.strip();
        items = items == null ? List.of() : List.copyOf(items);
        rows = rows == null ? List.of() : rows.stream().map(List::copyOf).toList();
        require(text.length() <= 10000 && value.length() <= 10000 && alt.length() <= 300 && items.size() <= 100
                        && rows.size() <= 200 && rows.stream().allMatch(r -> r.size() <= 12),
                "INVALID_STAFF", "Nội dung hồ sơ vượt giới hạn.");
        require(kind != Kind.IMAGE || assetId != null, "INVALID_STAFF", "Ảnh hồ sơ chưa được chọn.");
    }
}
