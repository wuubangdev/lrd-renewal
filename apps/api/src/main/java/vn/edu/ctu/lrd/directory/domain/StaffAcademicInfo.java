package vn.edu.ctu.lrd.directory.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import java.util.List;

/** The fixed academic dossier shared by every staff member. Empty fields are valid. */
public record StaffAcademicInfo(String highestDegreeYear, String academicRank, String academicRankYear,
        String birthDate, String birthPlace, String researchInterests,
        List<StaffEducation> undergraduate, List<StaffEducation> postgraduate,
        List<StaffCareer> workHistory, List<StaffActivity> researchProjects,
        List<StaffActivity> publications, List<StaffActivity> books,
        List<StaffActivity> supervisions, List<StaffActivity> trainingCourses,
        List<StaffActivity> awards, List<StaffActivity> memberships,
        List<StaffActivity> otherActivities, List<StaffLanguage> languages) {
    public StaffAcademicInfo {
        highestDegreeYear = clean(highestDegreeYear); academicRank = clean(academicRank);
        academicRankYear = clean(academicRankYear); birthDate = clean(birthDate);
        birthPlace = clean(birthPlace); researchInterests = clean(researchInterests);
        undergraduate = copy(undergraduate); postgraduate = copy(postgraduate);
        workHistory = copy(workHistory); researchProjects = copy(researchProjects);
        publications = copy(publications); books = copy(books); supervisions = copy(supervisions);
        trainingCourses = copy(trainingCourses); awards = copy(awards);
        memberships = copy(memberships); otherActivities = copy(otherActivities); languages = copy(languages);
        require(highestDegreeYear.length() <= 60 && academicRank.length() <= 120
                        && academicRankYear.length() <= 60 && birthDate.length() <= 80
                        && birthPlace.length() <= 200 && researchInterests.length() <= 3000,
                "INVALID_STAFF", "Lý lịch khoa học vượt giới hạn.");
        require(undergraduate.size() <= 50 && postgraduate.size() <= 50 && workHistory.size() <= 100
                        && researchProjects.size() <= 300 && publications.size() <= 500
                        && books.size() <= 200 && supervisions.size() <= 200
                        && trainingCourses.size() <= 200 && awards.size() <= 200
                        && memberships.size() <= 200 && otherActivities.size() <= 300 && languages.size() <= 50,
                "INVALID_STAFF", "Hồ sơ có quá nhiều dòng thông tin.");
    }
    static String clean(String value) { return value == null ? "" : value.strip(); }
    private static <T> List<T> copy(List<T> value) { return value == null ? List.of() : List.copyOf(value); }
    public static StaffAcademicInfo empty() {
        return new StaffAcademicInfo("", "", "", "", "", "", List.of(), List.of(), List.of(),
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of());
    }
}
