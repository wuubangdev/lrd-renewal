package vn.edu.ctu.lrd.academics.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import java.time.LocalDate;

/** Source dates are editorial evidence; they never replace an edition's publication timestamp. */
public record SourceReference(String url, LocalDate publishedOn, LocalDate retrievedOn) {
    public SourceReference {
        url = AcademicRules.https(url);
        require(
                !url.isBlank() && retrievedOn != null,
                "INVALID_SOURCE",
                "Nguồn cần URL và ngày đối chiếu.");
        require(
                publishedOn == null || !publishedOn.isAfter(retrievedOn),
                "INVALID_SOURCE",
                "Ngày đăng nguồn không được sau ngày đối chiếu.");
    }
}
