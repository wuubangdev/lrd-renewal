package vn.edu.ctu.lrd.directory.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import java.util.List;

/** Stable fields shared by every laboratory. */
public record LabContent(String overview, String functions, String duties, String researchDescription,
        List<String> researchAreas, List<LabEquipment> equipment, List<LabCourse> courses,
        List<LabPublication> publications, String additionalNotes) {
    public LabContent {
        overview = clean(overview); functions = clean(functions); duties = clean(duties);
        researchDescription = clean(researchDescription); additionalNotes = clean(additionalNotes);
        researchAreas = researchAreas == null ? List.of() : List.copyOf(researchAreas);
        equipment = equipment == null ? List.of() : List.copyOf(equipment);
        courses = courses == null ? List.of() : List.copyOf(courses);
        publications = publications == null ? List.of() : List.copyOf(publications);
        require(overview.length() <= 20000 && functions.length() <= 20000 && duties.length() <= 20000
                        && researchDescription.length() <= 20000 && additionalNotes.length() <= 20000
                        && researchAreas.size() <= 100 && equipment.size() <= 300 && courses.size() <= 200
                        && publications.size() <= 500, "INVALID_LAB", "Nội dung phòng thí nghiệm vượt giới hạn.");
        require(researchAreas.stream().allMatch(value -> value != null && value.length() <= 1000),
                "INVALID_LAB", "Lĩnh vực nghiên cứu vượt giới hạn.");
    }
    static String clean(String value) { return value == null ? "" : value.strip(); }
    public static LabContent empty() {
        return new LabContent("", "", "", "", List.of(), List.of(), List.of(), List.of(), "");
    }
}
