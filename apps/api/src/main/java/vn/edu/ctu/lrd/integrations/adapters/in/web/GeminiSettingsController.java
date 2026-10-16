package vn.edu.ctu.lrd.integrations.adapters.in.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.ctu.lrd.identity.api.ActorResolver;
import vn.edu.ctu.lrd.integrations.application.GeminiSettingsService;

@RestController
@RequestMapping("/api/v1/admin/integrations/gemini")
public class GeminiSettingsController {
    private final GeminiSettingsFacade facade;
    private final ActorResolver actors;

    public GeminiSettingsController(GeminiSettingsFacade facade, ActorResolver actors) {
        this.facade = facade;
        this.actors = actors;
    }

    public record SettingsRequest(@NotBlank @Size(max = 80) String model, @Size(max = 512) String apiKey) {}
    public record TestResult(boolean connected, String model) {}

    @GetMapping
    ResponseEntity<GeminiSettingsService.View> view() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(facade.view(actors.current()));
    }

    @PutMapping
    ResponseEntity<GeminiSettingsService.View> save(@Valid @RequestBody SettingsRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(facade.save(actors.current(), request.model(), request.apiKey()));
    }

    @DeleteMapping("/key")
    ResponseEntity<GeminiSettingsService.View> removeKey() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(facade.removeKey(actors.current()));
    }

    @PostMapping("/test")
    ResponseEntity<TestResult> test(@Valid @RequestBody SettingsRequest request) {
        facade.test(actors.current(), request.model(), request.apiKey());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new TestResult(true, request.model()));
    }
}
