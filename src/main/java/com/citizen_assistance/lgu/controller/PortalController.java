package com.citizen_assistance.lgu.controller;

import com.citizen_assistance.lgu.model.*;
import com.citizen_assistance.lgu.service.*;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class PortalController {
    private final AccountService accounts;
    private final OperationsService operations;

    public PortalController(AccountService accounts, OperationsService operations) {
        this.accounts = accounts;
        this.operations = operations;
    }

    @GetMapping("/csrf")
    public Map<String,String> csrf(CsrfToken token) {
        return Map.of("header", token.getHeaderName(), "token", token.getToken());
    }

    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED)
    public void register(@Valid @RequestBody Forms.Registration form) { accounts.register(form); }

    @GetMapping("/notices")
    public List<Map<String,Object>> notices() { return operations.notices(); }

    @GetMapping("/resident/dashboard")
    public Map<String,Object> resident(@AuthenticationPrincipal PortalAccount user) {
        return operations.residentDashboard(user.id());
    }

    @PostMapping("/resident/requests")
    public Map<String,Object> file(@AuthenticationPrincipal PortalAccount user, @Valid @RequestBody Forms.Filing form) {
        return operations.file(user.id(), form);
    }

    @GetMapping("/staff/dashboard")
    public Map<String,Object> staff(@AuthenticationPrincipal PortalAccount user) {
        return operations.staffDashboard(user.id());
    }

    @PutMapping("/staff/requests/{id}")
    public void review(@AuthenticationPrincipal PortalAccount user, @PathVariable long id, @Valid @RequestBody Forms.Review form) {
        operations.review(user.id(), id, form);
    }

    @PostMapping("/staff/teams") @ResponseStatus(HttpStatus.CREATED)
    public void team(@AuthenticationPrincipal PortalAccount user, @Valid @RequestBody Forms.Team form) {
        operations.addTeam(user.id(), form);
    }

    @PostMapping("/staff/notices") @ResponseStatus(HttpStatus.CREATED)
    public void publish(@AuthenticationPrincipal PortalAccount user, @Valid @RequestBody Forms.Notice form) {
        operations.publish(user.id(), form);
    }

    @PutMapping("/staff/accounts/{id}")
    public void access(@AuthenticationPrincipal PortalAccount user, @PathVariable long id, @Valid @RequestBody Forms.Access form) {
        operations.access(user.id(), id, form.enabled());
    }
}
