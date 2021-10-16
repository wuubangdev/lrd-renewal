package vn.edu.ctu.lrd.media.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import vn.edu.ctu.lrd.media.application.MediaService;
import vn.edu.ctu.lrd.media.application.port.*;

import java.time.Clock;

@Configuration
public class MediaConfiguration {
    @Bean
    MediaService mediaService(
            AssetRepository assets, ObjectStorage storage, ImageProcessor images, Clock clock) {
        return new MediaService(assets, storage, images, clock);
    }
}
