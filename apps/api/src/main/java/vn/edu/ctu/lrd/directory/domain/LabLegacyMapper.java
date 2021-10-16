package vn.edu.ctu.lrd.directory.domain;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/** Converts historical article-style laboratory sections to fixed fields on read. */
final class LabLegacyMapper {
    private LabLegacyMapper() { }
    static LabContent convert(List<StaffSection> sections) {
        if (sections == null || sections.isEmpty()) return LabContent.empty();
        var overview = new StringBuilder(); var functions = new StringBuilder();
        var duties = new StringBuilder(); var research = new StringBuilder(); var other = new StringBuilder();
        var areas = new ArrayList<String>(); var equipment = new ArrayList<LabEquipment>();
        var courses = new ArrayList<LabCourse>(); var publications = new ArrayList<LabPublication>();
        for (var section : sections) {
            var title = normalize(section.title());
            if (title.contains("thiet bi")) {
                for (var block : section.blocks()) {
                    if (block.kind() != StaffBlock.Kind.TABLE) continue;
                    for (var row : block.rows()) {
                        if (row.size() < 2 || normalize(row.get(1)).contains("ten thiet bi")) continue;
                        if (!row.get(1).isBlank()) equipment.add(new LabEquipment(limit(row.get(1), 300),
                                row.size() > 2 ? limit(row.get(2), 80) : "", "", null, ""));
                    }
                }
            } else if (title.contains("hoc phan")) {
                var level = title.contains("sau dai hoc") ? LabCourse.Level.POSTGRADUATE : LabCourse.Level.UNDERGRADUATE;
                for (var block : section.blocks()) {
                    if (block.kind() == StaffBlock.Kind.FACT) {
                        if (normalize(block.text()).contains("sau dai hoc")) level = LabCourse.Level.POSTGRADUATE;
                        else if (normalize(block.text()).contains("dai hoc")) level = LabCourse.Level.UNDERGRADUATE;
                    }
                    var names = block.kind() == StaffBlock.Kind.LIST ? block.items()
                            : block.kind() == StaffBlock.Kind.TEXT ? List.of(block.text()) : List.<String>of();
                    for (var name : names) if (!name.isBlank()) courses.add(new LabCourse(limit(name.replaceFirst("^[-–]\\s*", ""), 300),
                            extractCode(name), level, ""));
                }
            } else if (title.contains("xuat ban") || title.contains("quoc te") || title.contains("trong nuoc")) {
                for (var block : section.blocks()) {
                    var citations = switch (block.kind()) {
                        case TEXT -> List.of(block.text());
                        case FACT -> List.of((block.text() + " " + block.value()).strip());
                        case LIST -> block.items();
                        default -> List.<String>of();
                    };
                    for (var citation : citations) if (!citation.isBlank()
                            && !normalize(citation).matches("tieng anh|tieng viet"))
                        publications.add(new LabPublication(limit(citation, 5000), extractYear(citation), ""));
                }
            } else if (title.contains("linh vuc nghien cuu")) {
                for (var block : section.blocks()) {
                    if (block.kind() == StaffBlock.Kind.LIST) {
                        for (var item : block.items()) if (!item.isBlank()) areas.add(limit(item, 1000));
                    } else if (block.kind() == StaffBlock.Kind.TEXT) append(research, block.text());
                }
            } else {
                var target = title.contains("chuc nang") ? functions : title.contains("nhiem vu") ? duties
                        : title.contains("gioi thieu") || title.contains("land resource") ? overview : other;
                for (var block : section.blocks()) {
                    if (block.kind() == StaffBlock.Kind.TEXT) append(target, block.text());
                    if (block.kind() == StaffBlock.Kind.FACT) append(target, (block.text() + ": " + block.value()).strip());
                    if (block.kind() == StaffBlock.Kind.LIST) for (var item : block.items()) append(target, item);
                }
            }
        }
        return new LabContent(limit(overview.toString(), 20000), limit(functions.toString(), 20000),
                limit(duties.toString(), 20000), limit(research.toString(), 20000), areas,
                equipment, courses, publications, limit(other.toString(), 20000));
    }
    private static void append(StringBuilder target, String text) {
        if (text == null || text.isBlank()) return;
        if (!target.isEmpty()) target.append("\n\n");
        target.append(text.strip());
    }
    private static String extractCode(String name) {
        var matcher = Pattern.compile("\\(([A-Z]{2,5}\\d{2,4})\\)").matcher(name);
        return matcher.find() ? matcher.group(1) : "";
    }
    private static String extractYear(String value) {
        var matcher = Pattern.compile("(?:19|20)\\d{2}").matcher(value);
        return matcher.find() ? matcher.group() : "";
    }
    private static String limit(String value, int max) { return value.length() <= max ? value : value.substring(0, max); }
    private static String normalize(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .replace('đ', 'd').replace('Đ', 'D').toLowerCase(Locale.ROOT);
    }
}
