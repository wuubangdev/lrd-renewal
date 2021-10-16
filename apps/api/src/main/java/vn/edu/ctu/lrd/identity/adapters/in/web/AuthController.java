package vn.edu.ctu.lrd.identity.adapters.in.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.web.bind.annotation.*;

import vn.edu.ctu.lrd.identity.adapters.in.security.CmsPrincipal;
import vn.edu.ctu.lrd.identity.adapters.in.security.RouteHints;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthenticationManager manager;
    private final SecurityContextRepository contexts;
    private final CsrfTokenRepository csrf;
    private final RouteHints hints;
    private final Map<String, Attempt> attempts = new ConcurrentHashMap<>();

    private record Attempt(int count, long since) {}

    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}

    public record SessionUser(UUID id, String email, String name, Set<String> permissions) {}

    public AuthController(
            AuthenticationManager manager,
            SecurityContextRepository contexts,
            CsrfTokenRepository csrf,
            RouteHints hints) {
        this.manager = manager;
        this.contexts = contexts;
        this.csrf = csrf;
        this.hints = hints;
    }

    @GetMapping("/csrf")
    Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
    }

    @PostMapping("/login")
    SessionUser login(
            @Valid @RequestBody LoginRequest body,
            HttpServletRequest request,
            HttpServletResponse response) {
        String key =
                request.getRemoteAddr()
                        + ":"
                        + body.email().strip().toLowerCase(java.util.Locale.ROOT);
        long now = System.currentTimeMillis();
        if (attempts.size() > 10000)
            attempts.entrySet().removeIf(e -> now - e.getValue().since() > 600000);
        var attempt =
                attempts.compute(
                        key,
                        (k, v) ->
                                v == null || now - v.since() > 600000
                                        ? new Attempt(1, now)
                                        : new Attempt(v.count() + 1, v.since()));
        DomainException.require(
                attempt.count() <= 12,
                "RATE_LIMITED",
                "Bạn đã thử đăng nhập nhiều lần. Vui lòng thử lại sau.");
        try {
            var auth =
                    manager.authenticate(
                            UsernamePasswordAuthenticationToken.unauthenticated(
                                    body.email(), body.password()));
            request.getSession(true);
            new ChangeSessionIdAuthenticationStrategy().onAuthentication(auth, request, response);
            var context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(auth);
            SecurityContextHolder.setContext(context);
            contexts.saveContext(context, request, response);
            csrf.saveToken(null, request, response);
            attempts.remove(key);
            var principal = (CmsPrincipal) auth.getPrincipal();
            hints.issue(principal, response);
            return dto(principal);
        } catch (AuthenticationException ex) {
            throw new DomainException("UNAUTHORIZED", "Email hoặc mật khẩu không đúng.");
        }
    }

    @GetMapping("/me")
    SessionUser me() {
        return dto(current());
    }

    @GetMapping("/route-context")
    SessionUser routeContext(HttpServletResponse response) {
        var p = current();
        hints.issue(p, response);
        return dto(p);
    }

    @PostMapping("/logout")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    void logout(HttpServletRequest request, HttpServletResponse response) {
        csrf.saveToken(null, request, response);
        var session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        hints.clear(response);
    }

    private CmsPrincipal current() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof CmsPrincipal p))
            throw new DomainException("UNAUTHORIZED", "Vui lòng đăng nhập.");
        return p;
    }

    private SessionUser dto(CmsPrincipal p) {
        return new SessionUser(p.id, p.email, p.name, p.permissions);
    }
}
