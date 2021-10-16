package vn.edu.ctu.lrd;

import static org.junit.jupiter.api.Assertions.*;

import java.io.*;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import vn.edu.ctu.lrd.platform.spreadsheet.WorkbookTable;
import vn.edu.ctu.lrd.platform.spreadsheet.WorkbookTable.Spec;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

class SpreadsheetTest {
    private static final Spec[] SPECS = {
        new Spec("People", "key", "name"),
        new Spec("Specialties", "key", "specialty")
    };

    @Test
    void templateCanBeFilledAndChildRowsAreBoundByKey() throws Exception {
        byte[] bytes = WorkbookTable.template("Cán bộ", SPECS);
        try (var workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            var main = workbook.getSheet("People").createRow(1);
            main.createCell(0).setCellValue("staff-1");
            main.createCell(1).setCellValue("Nguyễn Văn A");
            var child = workbook.getSheet("Specialties").createRow(1);
            child.createCell(0).setCellValue("staff-1");
            child.createCell(1).setCellValue("GIS");
            try (var output = new ByteArrayOutputStream()) {
                workbook.write(output);
                var sheets = WorkbookTable.read(output.toByteArray(), SPECS);
                assertEquals("Nguyễn Văn A", sheets.get("People").getFirst().get("name"));
                assertEquals("GIS", WorkbookTable.children(sheets.get("People"), sheets.get("Specialties"))
                        .get("staff-1").getFirst().get("specialty"));
            }
        }
    }

    @Test
    void rejectsFormulaAndOrphanChildBeforeImport() throws Exception {
        byte[] bytes = WorkbookTable.template("Cán bộ", SPECS);
        try (var workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            var main = workbook.getSheet("People").createRow(1);
            main.createCell(0).setCellValue("staff-1");
            main.createCell(1).setCellFormula("1+1");
            try (var output = new ByteArrayOutputStream()) {
                workbook.write(output);
                assertEquals("INVALID_SPREADSHEET", assertThrows(DomainException.class,
                        () -> WorkbookTable.read(output.toByteArray(), SPECS)).code());
            }
            main.getCell(1).setCellType(CellType.STRING);
            main.getCell(1).setCellValue("A");
            var child = workbook.getSheet("Specialties").createRow(1);
            child.createCell(0).setCellValue("missing");
            child.createCell(1).setCellValue("GIS");
            try (var output = new ByteArrayOutputStream()) {
                workbook.write(output);
                var sheets = WorkbookTable.read(output.toByteArray(), SPECS);
                assertThrows(DomainException.class,
                        () -> WorkbookTable.children(sheets.get("People"), sheets.get("Specialties")));
            }
        }
    }
}
