package vn.edu.ctu.lrd.media.adapters.out.storage;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import org.springframework.stereotype.Component;

import vn.edu.ctu.lrd.media.application.port.ImageProcessor;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

import javax.imageio.ImageIO;

@Component
public class SafeImageProcessor implements ImageProcessor {
    public Image process(byte[] input) {
        try (var stream = ImageIO.createImageInputStream(new ByteArrayInputStream(input))) {
            var readers = ImageIO.getImageReaders(stream);
            require(readers.hasNext(), "INVALID_IMAGE", "Chọn một ảnh JPEG hoặc PNG hợp lệ.");
            var reader = readers.next();
            try {
                reader.setInput(stream, true, true);
                var format = reader.getFormatName().toLowerCase(java.util.Locale.ROOT);
                require(
                        java.util.Set.of("jpeg", "jpg", "png").contains(format),
                        "INVALID_IMAGE",
                        "Chỉ hỗ trợ JPEG và PNG.");
                int width = reader.getWidth(0), height = reader.getHeight(0);
                require(
                        width > 0 && height > 0 && (long) width * height <= 20_000_000,
                        "INVALID_IMAGE",
                        "Ảnh tối đa 20 megapixel.");
                var decoded = reader.read(0);
                boolean alpha = decoded.getColorModel().hasAlpha();
                double scale = Math.min(1.0, 2400.0 / Math.max(width, height));
                int w = Math.max(1, (int) (width * scale)), h = Math.max(1, (int) (height * scale));
                var clean =
                        new BufferedImage(
                                w,
                                h,
                                alpha ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
                var graphics = clean.createGraphics();
                graphics.setRenderingHint(
                        RenderingHints.KEY_INTERPOLATION,
                        RenderingHints.VALUE_INTERPOLATION_BICUBIC);
                graphics.drawImage(decoded, 0, 0, w, h, null);
                graphics.dispose();
                var bytes = new ByteArrayOutputStream();
                String extension = alpha ? "png" : "jpg";
                ImageIO.write(clean, alpha ? "png" : "jpeg", bytes);
                return new Image(
                        bytes.toByteArray(), alpha ? "image/png" : "image/jpeg", w, h, extension);
            } finally {
                reader.dispose();
            }
        } catch (DomainException e) {
            throw e;
        } catch (Exception e) {
            throw new DomainException(
                    "INVALID_IMAGE", "Không thể đọc ảnh. Hãy chọn JPEG hoặc PNG khác.");
        }
    }
}
