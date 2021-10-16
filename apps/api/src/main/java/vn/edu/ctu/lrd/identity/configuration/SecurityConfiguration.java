package vn.edu.ctu.lrd.identity.configuration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

import vn.edu.ctu.lrd.identity.adapters.in.security.AllowedOriginFilter;
import vn.edu.ctu.lrd.identity.adapters.in.security.CmsPrincipal;
import vn.edu.ctu.lrd.identity.adapters.in.security.SessionAccountFilter;
import vn.edu.ctu.lrd.identity.application.port.AccountRepository;

import java.util.Locale;

@Configuration
public class SecurityConfiguration {
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    UserDetailsService users(AccountRepository accounts) {
        return email ->
                new CmsPrincipal(
                        accounts.findByEmail(email.strip().toLowerCase(Locale.ROOT))
                                .orElseThrow(
                                        () ->
                                                new UsernameNotFoundException(
                                                        "Invalid credentials")));
    }

    @Bean
    AuthenticationManager authenticationManager(UserDetailsService users, PasswordEncoder encoder) {
        var provider = new DaoAuthenticationProvider(users);
        provider.setPasswordEncoder(encoder);
        return new ProviderManager(provider);
    }

    @Bean
    SecurityContextRepository contexts() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    CsrfTokenRepository csrfRepository() {
        return new HttpSessionCsrfTokenRepository();
    }

    @Bean
    CookieSerializer cookies(@Value("${lrd.auth.cookie-secure}") boolean secure) {
        var cookie = new DefaultCookieSerializer();
        cookie.setCookieName(secure ? "__Host-lrd-session" : "LRD_SESSION");
        cookie.setCookiePath("/");
        cookie.setUseHttpOnlyCookie(true);
        cookie.setUseSecureCookie(secure);
        cookie.setSameSite("Lax");
        return cookie;
    }

    @Bean
    SecurityFilterChain security(
            HttpSecurity http,
            AccountRepository accounts,
            SecurityContextRepository contexts,
            CsrfTokenRepository csrf,
            @Value("${lrd.auth.allowed-origins}") String allowedOrigins)
            throws Exception {
        return http.formLogin(f -> f.disable())
                .httpBasic(h -> h.disable())
                .logout(l -> l.disable())
                .requestCache(c -> c.disable())
                .securityContext(c -> c.securityContextRepository(contexts))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .csrf(
                        c ->
                                c.csrfTokenRepository(csrf)
                                        .csrfTokenRequestHandler(
                                                new CsrfTokenRequestAttributeHandler()))
                .authorizeHttpRequests(
                        a ->
                                a.dispatcherTypeMatchers(jakarta.servlet.DispatcherType.ERROR)
                                        .permitAll()
                                        .requestMatchers(
                                                "/api/v1/auth/login",
                                                "/api/v1/auth/csrf",
                                                "/api/v1/auth/reset-password",
                                                "/api/v1/public/**",
                                                "/actuator/health",
                                                "/actuator/health/**")
                                        .permitAll()
                                        .requestMatchers("/api/v1/admin/**", "/api/v1/auth/**")
                                        .authenticated()
                                        .anyRequest()
                                        .denyAll())
                .exceptionHandling(
                        e ->
                                e.authenticationEntryPoint(
                                                (req, res, ex) -> {
                                                    res.setStatus(401);
                                                    res.setContentType("application/problem+json");
                                                    res.getWriter()
                                                            .write(
                                                                    "{\"status\":401,\"code\":\"UNAUTHORIZED\",\"detail\":\"Vui"
                                                                        + " lòng đăng nhập.\"}");
                                                })
                                        .accessDeniedHandler(
                                                (req, res, ex) -> {
                                                    res.setStatus(403);
                                                    res.setContentType("application/problem+json");
                                                    res.getWriter()
                                                            .write(
                                                                    "{\"status\":403,\"code\":\"FORBIDDEN\",\"detail\":\"Không"
                                                                        + " có quyền hoặc mã bảo vệ"
                                                                        + " phiên không hợp"
                                                                        + " lệ.\"}");
                                                }))
                .addFilterBefore(new AllowedOriginFilter(allowedOrigins), CsrfFilter.class)
                .addFilterBefore(
                        new SessionAccountFilter(accounts, contexts), AuthorizationFilter.class)
                .build();
    }
}
