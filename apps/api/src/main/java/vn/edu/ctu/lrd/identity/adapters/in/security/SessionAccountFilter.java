package vn.edu.ctu.lrd.identity.adapters.in.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.filter.OncePerRequestFilter;

import vn.edu.ctu.lrd.identity.application.port.AccountRepository;

import java.io.IOException;

public class SessionAccountFilter extends OncePerRequestFilter {
    private final AccountRepository accounts;
    private final SecurityContextRepository contexts;

    public SessionAccountFilter(AccountRepository accounts, SecurityContextRepository contexts) {
        this.accounts = accounts;
        this.contexts = contexts;
    }

    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof CmsPrincipal p) {
            var account = accounts.findById(p.id);
            var session = request.getSession(false);
            if (account.isEmpty()
                    || !account.get().active()
                    || !account.get().passwordSet()
                    || account.get().authVersion() != p.authVersion
                    || session == null
                    || System.currentTimeMillis() - session.getCreationTime()
                            > 8 * 60 * 60 * 1000L) {
                if (session != null) session.invalidate();
                SecurityContextHolder.clearContext();
                response.setStatus(401);
                response.setContentType("application/problem+json");
                response.getWriter()
                        .write(
                                "{\"status\":401,\"code\":\"UNAUTHORIZED\",\"detail\":\"Phiên đăng"
                                        + " nhập đã kết thúc.\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
