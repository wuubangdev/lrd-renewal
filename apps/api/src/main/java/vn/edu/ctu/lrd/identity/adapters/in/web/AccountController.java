package vn.edu.ctu.lrd.identity.adapters.in.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import org.springframework.web.bind.annotation.*;

import vn.edu.ctu.lrd.identity.api.ActorResolver;
import vn.edu.ctu.lrd.identity.application.IdentityService;
import vn.edu.ctu.lrd.identity.domain.*;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/v1/admin")
public class AccountController {
    private final IdentityFacade identity;
    private final ActorResolver actors;

    public AccountController(IdentityFacade identity, ActorResolver actors) {
        this.identity = identity;
        this.actors = actors;
    }

    public record AccountView(
            UUID id,
            String email,
            String name,
            Role role,
            boolean active,
            boolean passwordSet,
            long version,
            Instant createdAt,
            Set<String> permissions) {
        static AccountView of(Account a) {
            return new AccountView(
                    a.id(),
                    a.email(),
                    a.displayName(),
                    a.role(),
                    a.active(),
                    a.passwordSet(),
                    a.version(),
                    a.createdAt(),
                    a.role().permissions());
        }
    }

    public record AccountRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(max = 120) String name,
            @NotNull Role role,
            boolean active) {}

    public record AccountPage(List<AccountView> items, long total, int page, int size) {}

    public record InvitationView(AccountView account, IdentityService.ResetLink reset) {}

    public record RoleView(Role code, String name, Set<String> permissions) {}

    @GetMapping("/users")
    AccountPage list(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var result = identity.list(actors.current(), q, page, size);
        return new AccountPage(
                result.items().stream().map(AccountView::of).toList(), result.total(), page, size);
    }

    @PostMapping("/users")
    @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    InvitationView invite(@Valid @RequestBody AccountRequest body) {
        var result = identity.invite(actors.current(), body.email(), body.name(), body.role());
        return new InvitationView(AccountView.of(result.account()), result.reset());
    }

    @PatchMapping("/users/{id}")
    AccountView update(
            @PathVariable UUID id,
            @RequestHeader(value = "If-Match", required = false) String match,
            @Valid @RequestBody AccountRequest body) {
        return AccountView.of(
                identity.update(
                        actors.current(),
                        id,
                        body.email(),
                        body.name(),
                        body.role(),
                        body.active(),
                        version(match)));
    }

    @PostMapping("/users/{id}/revoke-sessions")
    AccountView revoke(
            @PathVariable UUID id,
            @RequestHeader(value = "If-Match", required = false) String match) {
        return AccountView.of(identity.revoke(actors.current(), id, version(match)));
    }

    @PostMapping("/users/{id}/reset-links")
    IdentityService.ResetLink resetLink(
            @PathVariable UUID id,
            @RequestHeader(value = "If-Match", required = false) String match) {
        return identity.resetLink(actors.current(), id, version(match));
    }

    @GetMapping("/roles")
    List<RoleView> roles() {
        actors.current().require("identity:manage");
        return List.of(
                new RoleView(Role.ADMIN, "Quản trị viên", Role.ADMIN.permissions()),
                new RoleView(Role.EDITOR, "Biên tập viên", Role.EDITOR.permissions()),
                new RoleView(Role.AUTHOR, "Tác giả", Role.AUTHOR.permissions()));
    }

    private long version(String value) {
        DomainException.require(
                value != null, "PRECONDITION_REQUIRED", "Thiếu phiên bản tài khoản.");
        try {
            return Long.parseLong(value.replace("\"", ""));
        } catch (NumberFormatException ex) {
            throw new DomainException("INVALID_VERSION", "Phiên bản không hợp lệ.");
        }
    }
}
