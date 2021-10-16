package vn.edu.ctu.lrd.publishing.application.port;

import vn.edu.ctu.lrd.publishing.domain.DocumentNode;

import java.util.List;
import java.util.UUID;

/** Converts a Word file into the editor's document model. Storage is supplied by the caller. */
public interface DocxReader {
    record Imported(String title, String summary, DocumentNode document, int imageCount, List<String> warnings) {}

    @FunctionalInterface
    interface ImageSink {
        UUID store(String name, byte[] bytes);
    }

    Imported read(byte[] bytes, ImageSink images);
}
