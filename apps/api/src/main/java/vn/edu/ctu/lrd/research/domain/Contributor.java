package vn.edu.ctu.lrd.research.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import java.util.UUID;

public record Contributor(UUID staffId, String name, Role role) {
    public enum Role { AUTHOR, EDITOR, PRINCIPAL_INVESTIGATOR, MEMBER }
    public Contributor {
        name = name == null ? "" : name.strip();
        require(!name.isBlank() && name.length() <= 180 && role != null,
                "INVALID_RESEARCH", "Tác giả hoặc vai trò không hợp lệ.");
    }
}
