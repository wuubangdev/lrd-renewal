package vn.edu.ctu.lrd.publishing.adapters.out.docx;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.Test;
import vn.edu.ctu.lrd.publishing.domain.RichDocument;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.io.ByteArrayOutputStream;
import java.io.ByteArrayInputStream;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import org.apache.poi.util.Units;
import org.apache.poi.xwpf.usermodel.Document;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class PoiDocxReaderTest {
    @Test
    void importsTitleParagraphFormattingAndTable() throws Exception {
        byte[] bytes;
        try (var word = new XWPFDocument(); var out = new ByteArrayOutputStream()) {
            word.createParagraph().createRun().setText("Tiêu đề từ Word");
            var body = word.createParagraph();
            body.createRun().setText("Nội dung ");
            var bold = body.createRun();
            bold.setBold(true);
            bold.setText("quan trọng");
            var table = word.createTable(1, 1);
            table.getRow(0).getCell(0).setText("Ô dữ liệu");
            word.write(out);
            bytes = out.toByteArray();
        }
        var result = new PoiDocxReader().read(bytes, (name, data) -> UUID.randomUUID());
        assertEquals("Tiêu đề từ Word", result.title());
        assertTrue(result.summary().contains("Nội dung"));
        assertEquals("table", result.document().content().get(1).type());
        assertTrue(new RichDocument(result.document()).plainText().contains("Ô dữ liệu"));
        assertEquals("bold", result.document().content().get(0).content().get(1).marks().get(0).type());
    }

    @Test
    void rejectsInvalidWord() {
        assertThrows(DomainException.class,
                () -> new PoiDocxReader().read("not a zip".getBytes(), (name, data) -> UUID.randomUUID()));
    }

    @Test
    void importsEmbeddedPngThroughMediaSink() throws Exception {
        var png = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "png", png);
        var out = new ByteArrayOutputStream();
        try (var word = new XWPFDocument()) {
            word.createParagraph().createRun().setText("Bài có ảnh");
            word.createParagraph().createRun().addPicture(
                    new ByteArrayInputStream(png.toByteArray()), Document.PICTURE_TYPE_PNG,
                    "anh.png", Units.toEMU(100), Units.toEMU(100));
            word.write(out);
        }
        var imageId = UUID.randomUUID();
        var result = new PoiDocxReader().read(out.toByteArray(), (name, data) -> {
            assertTrue(name.endsWith(".png"));
            assertArrayEquals(png.toByteArray(), data);
            return imageId;
        });
        assertEquals(1, result.imageCount());
        assertEquals("image", result.document().content().get(0).type());
        assertEquals(imageId.toString(), result.document().content().get(0).attrs().get("assetId"));
        assertEquals(1, new RichDocument(result.document()).assetIds().size());
    }
}
