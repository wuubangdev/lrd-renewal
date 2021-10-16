package vn.edu.ctu.lrd.media.adapters.out.storage;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;

import vn.edu.ctu.lrd.media.application.port.ObjectStorage;

public class S3ObjectStorage implements ObjectStorage {
    private final S3Client client;
    private final String bucket;

    public S3ObjectStorage(S3Client client, String bucket) {
        this.client = client;
        this.bucket = bucket;
    }

    public void put(String key, String contentType, byte[] bytes) {
        client.putObject(
                b -> b.bucket(bucket).key(key).contentType(contentType),
                RequestBody.fromBytes(bytes));
    }

    public byte[] get(String key) {
        return client.getObjectAsBytes(b -> b.bucket(bucket).key(key)).asByteArray();
    }

    public void delete(String key) {
        client.deleteObject(b -> b.bucket(bucket).key(key));
    }
}
