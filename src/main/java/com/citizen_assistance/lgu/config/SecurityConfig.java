package com.citizen_assistance.lgu.config;

import com.citizen_assistance.lgu.model.PortalAccount;
import com.citizen_assistance.lgu.service.AccountService;
import jakarta.servlet.DispatcherType;
import org.springframework.context.annotation.*;
import org.springframework.security.authorization.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.password.*;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;

@Configuration
public class SecurityConfig {
    @Bean
    PasswordEncoder passwordEncoder() {
        return Pbkdf2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    }

    private AuthorizationManager<RequestAuthorizationContext> role(AccountService accounts, String role) {
        return (authentication, context) -> {
            var auth = authentication.get();
            boolean allowed = auth.getPrincipal() instanceof PortalAccount account
                && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_" + role))
                && accounts.hasCurrentRole(account.id(), role);
            return new AuthorizationDecision(allowed);
        };
    }

    @Bean
    SecurityFilterChain security(HttpSecurity http, AccountService accounts) throws Exception {
        http.authorizeHttpRequests(access -> access
            .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
            .requestMatchers("/", "/index.html", "/login.html", "/css/**", "/js/**", "/images/**",
                "/api/csrf", "/api/register", "/api/notices").permitAll()
            .requestMatchers("/admin.html", "/api/staff/**").access(role(accounts, "STAFF"))
            .requestMatchers("/resident.html", "/api/resident/**").access(role(accounts, "RESIDENT"))
            .anyRequest().denyAll())
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((req,res,ex) -> {
                    if (req.getRequestURI().startsWith(req.getContextPath() + "/api/")) res.setStatus(401);
                    else res.sendRedirect(req.getContextPath() + "/login.html");
                }))
            .formLogin(login -> login.loginPage("/login.html").loginProcessingUrl("/api/login")
                .usernameParameter("identifier")
                .successHandler((req,res,auth) -> {
                    var account = (PortalAccount) auth.getPrincipal();
                    res.setContentType("text/plain");
                    res.getWriter().print(account.landingPage());
                })
                .failureHandler((req,res,ex) -> res.setStatus(401)).permitAll())
            .logout(logout -> logout.logoutUrl("/api/logout").logoutSuccessHandler((req,res,auth) -> res.setStatus(204)));
        return http.build();
    }
}
