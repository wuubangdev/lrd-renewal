package vn.edu.ctu.lrd.media.adapters.in.web;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import vn.edu.ctu.lrd.identity.api.ActorResolver;
import vn.edu.ctu.lrd.media.application.MediaService;
import vn.edu.ctu.lrd.media.domain.MediaAsset;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class MediaController {
    private final MediaService service;
    private final ActorResolver actors;

    public record MediaView(
            UUID id,
            String name,
            String contentType,
            long size,
            int width,
            int height,
            String url) {}

    public MediaController(MediaService service, ActorResolver actors) {
        this.service = service;
        this.actors = actors;
    }

    @PostMapping(value = "/admin/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    MediaView upload(@RequestPart("file") MultipartFile file) throws IOException {
        return view(service.upload(actors.current(), file.getOriginalFilename(), file.getBytes()));
    }

    @GetMapping("/admin/media")
    List<MediaView> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "60") int size,
            @RequestParam(defaultValue = "") String q) {
        return service.list(actors.current(), page, size, q).stream().map(this::view).toList();
    }

    @GetMapping("/admin/media/{id}")
    ResponseEntity<byte[]> privateImage(@PathVariable UUID id) {
        return download(service.privateDownload(id, actors.current()));
    }

    @GetMapping("/public/media/{id}")
    ResponseEntity<byte[]> publicImage(@PathVariable UUID id) {
        return download(service.publicDownload(id));
    }

    private MediaView view(MediaAsset a) {
        return new MediaView(
                a.id(),
                a.name(),
                a.contentType(),
                a.size(),
                a.width(),
                a.height(),
                "/api/v1/admin/media/" + a.id());
    }

    private ResponseEntity<byte[]> download(MediaService.Download d) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(d.asset().contentType()))
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .contentLength(d.bytes().length)
                .body(d.bytes());
    }
}
