package vn.edu.ctu.lrd.directory.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

public record LabPublication(String citation, String year, String url) {
    public LabPublication {
        citation = LabContent.clean(citation); year = LabContent.clean(year); url = LabContent.clean(url);
        require(citation.length() <= 5000 && year.length() <= 60 && url.length() <= 500,
                "INVALID_LAB", "Công bố phòng thí nghiệm vượt giới hạn.");
        require(url.isBlank() || url.startsWith("https://"), "INVALID_LAB", "Liên kết công bố phải dùng HTTPS.");
    }
}
