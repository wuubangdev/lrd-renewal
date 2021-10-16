package vn.edu.ctu.lrd.platform.spreadsheet;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

/** Strict XLSX boundary: stable column names, no formulas, bounded rows and cell lengths. */
public final class WorkbookTable {
    private WorkbookTable() {}

    public record Spec(String name, String... columns) {}

    public record Entry(int line, Map<String, String> values) {
        public String get(String column) { return values.getOrDefault(column, ""); }
        public String required(String column) {
            String value = get(column);
            require(!value.isBlank(), "INVALID_SPREADSHEET", "Sheet " + values.get("_sheet") + ", dòng " + line + ": thiếu " + column + ".");
            return value;
        }
    }

    public static byte[] template(String title, Spec... specs) {
        try (var workbook = new XSSFWorkbook(); var output = new ByteArrayOutputStream()) {
            var header = workbook.createCellStyle();
            var font = workbook.createFont(); font.setBold(true); font.setColor(IndexedColors.WHITE.getIndex());
            header.setFont(font); header.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            header.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            var textCells = workbook.createCellStyle();
            textCells.setDataFormat(workbook.createDataFormat().getFormat("@"));
            var guide = workbook.createSheet("HuongDan");
            guide.createRow(0).createCell(0).setCellValue(title);
            guide.createRow(1).createCell(0).setCellValue("Mỗi hàng ở sheet chính tạo một bản nháp. Cột key phải duy nhất trong file.");
            guide.createRow(2).createCell(0).setCellValue("Sheet phụ dùng key để gắn nhiều mục vào bản ghi chính. Không sửa tên sheet/cột, không dùng công thức.");
            guide.createRow(3).createCell(0).setCellValue("Ngày: YYYY-MM-DD; số và boolean: nhập trực tiếp; URL ảnh dùng UUID đã tải lên CMS.");
            guide.createRow(4).createCell(0).setCellValue("Import là một giao dịch: nếu có lỗi, không tạo bản ghi nào. Dữ liệu mới luôn ở trạng thái bản nháp.");
            guide.setColumnWidth(0, 28000);
            for (var spec : specs) {
                var sheet = workbook.createSheet(spec.name());
                var row = sheet.createRow(0);
                for (int i = 0; i < spec.columns().length; i++) {
                    var cell = row.createCell(i); cell.setCellValue(spec.columns()[i]); cell.setCellStyle(header);
                    sheet.setColumnWidth(i, Math.min(10000, Math.max(4500, spec.columns()[i].length() * 450)));
                    sheet.setDefaultColumnStyle(i, textCells);
                }
                sheet.createFreezePane(0, 1);
                sheet.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, spec.columns().length - 1));
            }
            workbook.write(output);
            return output.toByteArray();
        } catch (IOException ex) { throw new IllegalStateException(ex); }
    }

    public static Map<String, List<Entry>> read(byte[] bytes, Spec... specs) {
        require(bytes != null && bytes.length > 0 && bytes.length <= 10_000_000,
                "INVALID_SPREADSHEET", "Tệp Excel trống hoặc vượt 10 MB.");
        require(bytes.length >= 4 && bytes[0] == 'P' && bytes[1] == 'K',
                "INVALID_SPREADSHEET", "Chỉ hỗ trợ file .xlsx.");
        try (var workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            var allowed = new HashSet<String>(); allowed.add("HuongDan");
            for (var spec : specs) allowed.add(spec.name());
            for (int i = 0; i < workbook.getNumberOfSheets(); i++)
                require(allowed.contains(workbook.getSheetName(i)), "INVALID_SPREADSHEET", "Sheet không được hỗ trợ: " + workbook.getSheetName(i));
            var result = new LinkedHashMap<String, List<Entry>>();
            var format = new DataFormatter(Locale.ROOT);
            for (var spec : specs) {
                var sheet = workbook.getSheet(spec.name());
                require(sheet != null, "INVALID_SPREADSHEET", "Thiếu sheet " + spec.name());
                var heading = sheet.getRow(0);
                require(heading != null && heading.getLastCellNum() == spec.columns().length,
                        "INVALID_SPREADSHEET", "Cột của sheet " + spec.name() + " không khớp mẫu.");
                for (int c = 0; c < spec.columns().length; c++)
                    require(spec.columns()[c].equals(format.formatCellValue(heading.getCell(c))),
                            "INVALID_SPREADSHEET", "Cột " + (c + 1) + " của sheet " + spec.name() + " không khớp mẫu.");
                require(sheet.getLastRowNum() <= 5000, "INVALID_SPREADSHEET", "Sheet " + spec.name() + " vượt 5000 dòng.");
                var entries = new ArrayList<Entry>();
                for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                    var row = sheet.getRow(r); if (row == null) continue;
                    var values = new LinkedHashMap<String, String>(); values.put("_sheet", spec.name());
                    boolean hasValue = false;
                    for (int c = 0; c < spec.columns().length; c++) {
                        var cell = row.getCell(c);
                        require(cell == null || cell.getCellType() != CellType.FORMULA,
                                "INVALID_SPREADSHEET", "Sheet " + spec.name() + ", dòng " + (r + 1) + ": không dùng công thức.");
                        String value = cell == null ? "" : format.formatCellValue(cell).strip();
                        require(value.length() <= 30000, "INVALID_SPREADSHEET", "Ô ở dòng " + (r + 1) + " quá dài.");
                        values.put(spec.columns()[c], value); hasValue |= !value.isBlank();
                    }
                    if (hasValue) entries.add(new Entry(r + 1, values));
                }
                result.put(spec.name(), List.copyOf(entries));
            }
            return result;
        } catch (DomainException ex) { throw ex;
        } catch (Exception ex) { throw new DomainException("INVALID_SPREADSHEET", "Không đọc được file .xlsx. Hãy tải lại mẫu và kiểm tra dữ liệu."); }
    }

    public static UUID uuid(String value, Entry entry, String column) {
        if (value.isBlank()) return null;
        try { return UUID.fromString(value); }
        catch (IllegalArgumentException ex) { throw new DomainException("INVALID_SPREADSHEET", "Dòng " + entry.line() + ": " + column + " phải là UUID."); }
    }

    public static Integer integer(String value, Entry entry, String column) {
        if (value.isBlank()) return null;
        try { return Integer.valueOf(value); }
        catch (NumberFormatException ex) { throw new DomainException("INVALID_SPREADSHEET", "Dòng " + entry.line() + ": " + column + " phải là số nguyên."); }
    }

    public static java.time.LocalDate date(String value, Entry entry, String column) {
        if (value.isBlank()) return null;
        try { return java.time.LocalDate.parse(value); }
        catch (Exception ex) { throw new DomainException("INVALID_SPREADSHEET", "Dòng " + entry.line() + ": " + column + " dùng dạng YYYY-MM-DD."); }
    }

    public static boolean bool(String value, Entry entry, String column) {
        if (value.isBlank() || value.equalsIgnoreCase("false") || value.equals("0")) return false;
        if (value.equalsIgnoreCase("true") || value.equals("1")) return true;
        throw new DomainException("INVALID_SPREADSHEET", "Dòng " + entry.line() + ": " + column + " chỉ nhận true/false.");
    }

    public static <E extends Enum<E>> E choice(String value, Class<E> type, Entry entry, String column) {
        try { return Enum.valueOf(type, value.toUpperCase(Locale.ROOT)); }
        catch (Exception ex) { throw new DomainException("INVALID_SPREADSHEET", "Dòng " + entry.line() + ": " + column + " không hợp lệ. Chọn " + Arrays.toString(type.getEnumConstants())); }
    }

    public static Map<String, List<Entry>> children(List<Entry> parents, List<Entry> rows) {
        var result = new LinkedHashMap<String, List<Entry>>();
        for (var parent : parents) {
            var key = parent.required("key");
            require(result.putIfAbsent(key, new ArrayList<>()) == null, "INVALID_SPREADSHEET", "Trùng key " + key + " ở sheet chính.");
        }
        for (var row : rows) {
            var key = row.required("key");
            require(result.containsKey(key), "INVALID_SPREADSHEET", "Dòng " + row.line() + ": key " + key + " không có trong sheet chính.");
            result.get(key).add(row);
        }
        return result;
    }
}
