package vn.edu.ctu.lrd.academics.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import java.util.List;

/** A labelled official document or reference; the backend never fetches this URL. */
public record AcademicResource(String label, String url) {
    public AcademicResource {
        label = AcademicRules.text(label, 180);
        url =
                url != null && url.matches("/(vi|en)/tin-tuc/[a-z0-9]+(?:-[a-z0-9]+)*")
                        ? url
                        : AcademicRules.https(url);
        require(
                !label.isBlank() && !url.isBlank(),
                "INVALID_RESOURCE",
                "Tài liệu cần tên và URL HTTPS hoặc đường dẫn bài viết nội bộ.");
    }

    public static List<AcademicResource> validated(List<AcademicResource> resources) {
        // Old published JSON snapshots predate this optional field.
        if (resources == null) return List.of();
        require(
                resources.size() <= 20 && resources.stream().noneMatch(java.util.Objects::isNull),
                "INVALID_RESOURCE",
                "Tối đa 20 tài liệu, không có mục trống.");
        require(
                resources.stream().map(AcademicResource::url).distinct().count()
                        == resources.size(),
                "INVALID_RESOURCE",
                "URL tài liệu bị trùng.");
        return List.copyOf(resources);
    }
}
