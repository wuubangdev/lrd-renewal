package vn.edu.ctu.lrd.publishing.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

public record ArticleCategory(String code, String nameVi, String nameEn, int sortOrder) {
    public ArticleCategory {
        require(code != null && code.matches("[A-Z][A-Z0-9_]{2,39}"),
                "INVALID_CATEGORY", "Mã chuyên mục gồm 3–40 chữ in hoa, số hoặc dấu gạch dưới.");
        nameVi = nameVi == null ? "" : nameVi.strip();
        nameEn = nameEn == null ? "" : nameEn.strip();
        require(!nameVi.isBlank() && nameVi.length() <= 80 && !nameEn.isBlank()
                        && nameEn.length() <= 80 && sortOrder >= 0 && sortOrder <= 10000,
                "INVALID_CATEGORY", "Tên chuyên mục tối đa 80 ký tự; thứ tự từ 0 đến 10000.");
    }
}
