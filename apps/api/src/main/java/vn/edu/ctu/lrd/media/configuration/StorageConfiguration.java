package vn.edu.ctu.lrd.media.configuration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.S3Exception;

import vn.edu.ctu.lrd.media.adapters.out.storage.S3ObjectStorage;
import vn.edu.ctu.lrd.media.application.port.ObjectStorage;

import java.net.URI;

@Configuration
@ConditionalOnProperty(name = "lrd.storage.enabled", havingValue = "true", matchIfMissing = true)
public class StorageConfiguration {
    @Bean
    S3Client s3(
            @Value("${lrd.storage.endpoint}") String endpoint,
            @Value("${lrd.storage.access-key}") String access,
            @Value("${lrd.storage.secret-key}") String secret) {
        return S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.US_EAST_1)
                .forcePathStyle(true)
                .credentialsProvider(
                        StaticCredentialsProvider.create(
                                AwsBasicCredentials.create(access, secret)))
                .httpClientBuilder(UrlConnectionHttpClient.builder())
                .build();
    }

    @Bean
    ObjectStorage objectStorage(S3Client s3, @Value("${lrd.storage.bucket}") String bucket) {
        return new S3ObjectStorage(s3, bucket);
    }

    @Bean
    ApplicationRunner ensureBucket(S3Client s3, @Value("${lrd.storage.bucket}") String bucket) {
        return args -> {
            try {
                s3.headBucket(b -> b.bucket(bucket));
            } catch (S3Exception e) {
                if (e.statusCode() != 404) throw e;
                s3.createBucket(b -> b.bucket(bucket));
            }
        };
    }
}
