package vn.edu.ctu.lrd.identity.adapters.in.web;

import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import vn.edu.ctu.lrd.identity.adapters.in.security.RouteHints;
import vn.edu.ctu.lrd.identity.api.ActorResolver;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/v1/auth")
public class PasswordController {
    private final IdentityFacade identity;
    private final ActorResolver actors;
    private final RouteHints hints;
    private final ConcurrentHashMap<String, Attempt> attempts = new ConcurrentHashMap<>();

    private record Attempt(int count, long since) {}

    public record ChangeRequest(
            @NotBlank @Size(max = 100) String currentPassword,
            @NotBlank @Size(max = 100) String password) {}

    public record ResetRequest(
            @NotBlank @Size(max = 100) String token, @NotBlank @Size(max = 100) String password) {}

    public PasswordController(IdentityFacade identity, ActorResolver actors, RouteHints hints) {
        this.identity = identity;
        this.actors = actors;
        this.hints = hints;
    }

    @PostMapping("/change-password")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    void change(
            @Valid @RequestBody ChangeRequest body,
            HttpServletRequest request,
            HttpServletResponse response) {
        limit("change:" + actors.current().id());
        identity.changePassword(actors.current(), body.currentPassword(), body.password());
        logout(request, response);
    }

    @PostMapping("/reset-password")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    void reset(
            @Valid @RequestBody ResetRequest body,
            HttpServletRequest request,
            HttpServletResponse response) {
        limit("reset:" + request.getRemoteAddr());
        identity.resetPassword(body.token(), body.password());
        logout(request, response);
    }

    private void logout(HttpServletRequest request, HttpServletResponse response) {
        var session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        hints.clear(response);
    }

    private void limit(String key) {
        long now = System.currentTimeMillis();
        if (attempts.size() > 10000)
            attempts.entrySet().removeIf(e -> now - e.getValue().since() > 600000);
        var a =
                attempts.compute(
                        key,
                        (k, v) ->
                                v == null || now - v.since() > 600000
                                        ? new Attempt(1, now)
                                        : new Attempt(v.count() + 1, v.since()));
        DomainException.require(
                a.count() <= 12,
                "RATE_LIMITED",
                "Bạn đã thử nhiều lần. Vui lòng thử lại sau 10 phút.");
    }
}
