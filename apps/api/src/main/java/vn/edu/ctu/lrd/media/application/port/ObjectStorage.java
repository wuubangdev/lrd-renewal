package vn.edu.ctu.lrd.media.application.port;

public interface ObjectStorage {
    void put(String key, String contentType, byte[] bytes);

    byte[] get(String key);

    void delete(String key);
}
