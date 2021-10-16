package vn.edu.ctu.lrd.directory.domain;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Reads historical free-form profiles into the stable dossier fields. */
final class StaffLegacyMapper {
    private StaffLegacyMapper() { }

    static StaffAcademicInfo convert(List<StaffSection> sections) {
        var base = StaffAcademicInfo.empty();
        if (sections == null || sections.isEmpty()) return base;
        var undergraduate = new ArrayList<StaffEducation>();
        var postgraduate = new ArrayList<StaffEducation>();
        var career = new ArrayList<StaffCareer>();
        var research = new ArrayList<StaffActivity>();
        var publications = new ArrayList<StaffActivity>();
        var books = new ArrayList<StaffActivity>();
        var supervisions = new ArrayList<StaffActivity>();
        var training = new ArrayList<StaffActivity>();
        var awards = new ArrayList<StaffActivity>();
        var memberships = new ArrayList<StaffActivity>();
        var other = new ArrayList<StaffActivity>();
        var languages = new ArrayList<StaffLanguage>();
        String degreeYear = "", rank = "", rankYear = "", birthDate = "", birthPlace = "", interests = "";
        for (var section : sections) {
            var heading = normalize(section.title());
            var context = heading;
            EducationBuilder education = null;
            for (var block : section.blocks()) {
                if (block.kind() == StaffBlock.Kind.LIST && block.items().size() == 1) {
                    String label = block.items().getFirst();
                    if (isEducation(heading) && educationDegree(label) != null) {
                        if (education != null) addEducation(education, undergraduate, postgraduate);
                        education = new EducationBuilder(educationDegree(label));
                    } else if (looksLikeHeading(label)) {
                        context = normalize(label);
                    } else {
                        addActivity(target(context, research, publications, books, supervisions, training, awards, memberships, other),
                                label, "", "", "", "", "");
                    }
                    continue;
                }
                if (block.kind() == StaffBlock.Kind.FACT) {
                    String key = normalize(block.text());
                    if (isBio(heading)) {
                        if (key.contains("hoc vi cao nhat")) degreeYear = year(block.value());
                        else if (key.contains("chuc danh khoa hoc")) {
                            rank = block.value().replaceFirst("(?i)\\s*Năm phong.*$", "").strip();
                            rankYear = year(block.value());
                        }
                        else if (key.contains("nam phong")) rankYear = block.value();
                        else if (key.contains("ngay sinh")) birthDate = block.value();
                        else if (key.contains("noi sinh")) birthPlace = block.value();
                        else if (key.contains("linh vuc nghien cuu")) interests = block.value();
                        else if (!key.contains("ho va ten") && !key.contains("don vi") && !key.contains("e-mail")
                                && !key.contains("email") && !key.contains("dien thoai"))
                            addActivity(other, block.text(), "", "", "", block.value(), "");
                    } else if (key.contains("ngoai ngu")) {
                        languages.add(new StaffLanguage(limit(block.value(), 120), "", ""));
                    } else if (isEducation(heading)) {
                        if (education == null) education = new EducationBuilder(educationDegree(section.title()) == null ? "Đào tạo" : educationDegree(section.title()));
                        education.accept(key, block.value());
                    } else {
                        addActivity(target(context, research, publications, books, supervisions, training, awards, memberships, other),
                                block.text(), "", "", "", block.value(), "");
                    }
                } else if (block.kind() == StaffBlock.Kind.TABLE) {
                    var rows = block.rows();
                    boolean careerTable = isCareer(heading) || (!rows.isEmpty() && normalize(String.join(" ", rows.getFirst())).contains("noi cong tac"));
                    for (int i = !rows.isEmpty() && isHeaderRow(rows.getFirst()) ? 1 : 0; i < rows.size(); i++) {
                        var row = rows.get(i);
                        if (row.stream().allMatch(String::isBlank)) continue;
                        if (careerTable) {
                            career.add(new StaffCareer(limit(cell(row, 0), 120), limit(cell(row, 1), 300),
                                    limit(cell(row, 2), 200), limit(join(row, 3), 3000)));
                        } else {
                            var dest = target(context, research, publications, books, supervisions, training, awards, memberships, other);
                            String first = cell(row, 0);
                            int titleColumn = first.matches("\\d+[.)]?") && row.size() > 1 ? 1 : 0;
                            addActivity(dest, cell(row, titleColumn), "", "", "", join(row, titleColumn + 1), "");
                        }
                    }
                } else if (block.kind() == StaffBlock.Kind.TEXT && !block.text().isBlank()
                        && !block.text().matches("(?:19|20)\\d{2}")) {
                    addActivity(target(context, research, publications, books, supervisions, training, awards, memberships, other),
                            section.title(), "", "", "", block.text(), "");
                } else if (block.kind() == StaffBlock.Kind.LIST) {
                    for (var item : block.items()) addActivity(target(context, research, publications, books, supervisions, training, awards, memberships, other),
                            item, "", "", "", "", "");
                }
            }
            if (education != null) addEducation(education, undergraduate, postgraduate);
        }
        return new StaffAcademicInfo(degreeYear, rank, rankYear, birthDate, birthPlace, interests,
                undergraduate, postgraduate, career, research, publications, books, supervisions,
                training, awards, memberships, other, languages);
    }

    private static boolean isBio(String s) { return s.contains("ly lich") || s.contains("thong tin chuyen mon"); }
    private static boolean isEducation(String s) { return s.contains("dao tao") || s.contains("dai hoc") || s.contains("thac si") || s.contains("tien si") || s.contains("sau dai hoc"); }
    private static boolean isCareer(String s) { return s.contains("cong tac"); }
    private static boolean isHeaderRow(List<String> row) {
        if (row.isEmpty()) return false;
        var first = normalize(row.getFirst()).strip();
        return first.equals("stt") || first.equals("tt") || first.equals("nam")
                || first.startsWith("thoi gian") || first.startsWith("ten ") || first.equals("ho va ten");
    }
    private static String educationDegree(String s) {
        var n = normalize(s);
        if (n.contains("tien si")) return "Tiến sĩ";
        if (n.contains("thac si")) return "Thạc sĩ";
        if (n.contains("sau dai hoc")) return "Sau đại học";
        if (n.contains("dai hoc")) return "Đại học";
        return null;
    }
    private static void addEducation(EducationBuilder row, List<StaffEducation> under, List<StaffEducation> post) {
        var value = row.build();
        if (value.filled()) ("Đại học".equals(value.degree()) ? under : post).add(value);
    }
    private static boolean looksLikeHeading(String s) {
        var n = normalize(s);
        return n.contains("de tai") || n.contains("cong trinh") || n.contains("sach")
                || n.contains("tap huan") || n.contains("luan van") || n.contains("hoat dong")
                || n.contains("xuat ban") || n.contains("ngoai ngu");
    }
    private static List<StaffActivity> target(String heading, List<StaffActivity> research,
            List<StaffActivity> publications, List<StaffActivity> books, List<StaffActivity> supervisions,
            List<StaffActivity> training, List<StaffActivity> awards, List<StaffActivity> memberships,
            List<StaffActivity> other) {
        if (heading.contains("de tai") || heading.contains("nghien cuu khoa hoc") || heading.contains("du an")) return research;
        if (heading.contains("cong trinh") || heading.contains("tap chi") || heading.contains("xuat ban")) return publications;
        if (heading.strip().matches("(?:19|20)\\d{2}(?:\\s*[-–]\\s*(?:19|20)\\d{2})?")) return publications;
        if (heading.contains("sach") || heading.contains("giao trinh")) return books;
        if (heading.contains("huong dan") || heading.contains("luan van")) return supervisions;
        if (heading.contains("tap huan") || heading.contains("khoa dao tao")) return training;
        if (heading.contains("giai thuong") || heading.contains("khen thuong")) return awards;
        if (heading.contains("thanh vien") || heading.contains("to chuc khoa hoc")) return memberships;
        return other;
    }
    private static void addActivity(List<StaffActivity> list, String title, String period, String organization,
            String role, String description, String url) {
        var value = new StaffActivity(limit(title, 1000), period, organization, role, limit(description, 10000), url);
        if (value.filled()) list.add(value);
    }
    private static String cell(List<String> row, int index) { return index < row.size() ? row.get(index) : ""; }
    private static String join(List<String> row, int start) {
        if (start >= row.size()) return "";
        return limit(String.join(" · ", row.subList(start, row.size()).stream().filter(s -> !s.isBlank()).toList()), 10000);
    }
    private static String limit(String text, int max) { return text.length() <= max ? text : text.substring(0, max); }
    private static String year(String text) {
        var matcher = java.util.regex.Pattern.compile("(?:19|20)\\d{2}").matcher(text);
        String value = "";
        while (matcher.find()) value = matcher.group();
        return value;
    }
    private static String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .replace('đ', 'd').replace('Đ', 'D').toLowerCase(Locale.ROOT);
    }
    private static final class EducationBuilder {
        private final String degree;
        private String period = "", institution = "", major = "", year = "", thesis = "", mode = "";
        EducationBuilder(String degree) { this.degree = degree; }
        void accept(String key, String value) {
            if (key.contains("noi dao tao")) institution = value;
            else if (key.contains("chuyen nganh") || key.contains("nganh hoc")) major = value;
            else if (key.contains("nam tot nghiep") || key.contains("cap bang")) year = value;
            else if (key.contains("luan van") || key.contains("luan an")) thesis = value;
            else if (key.contains("thoi gian")) period = value;
            else if (key.contains("he dao tao")) mode = value;
            else if (key.contains("ngoai ngu")) thesis = value;
        }
        StaffEducation build() { return new StaffEducation(degree, period, institution, major, year, thesis, mode); }
    }
}
