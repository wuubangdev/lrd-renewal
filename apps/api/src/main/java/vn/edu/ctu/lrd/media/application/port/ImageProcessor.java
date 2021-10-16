package vn.edu.ctu.lrd.media.application.port;

public interface ImageProcessor {
    record Image(byte[] bytes, String contentType, int width, int height, String extension) {}

    Image process(byte[] input);
}
