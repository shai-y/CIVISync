package com.citizen_assistance.lgu.model;

import java.util.List;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;

/** Session principal. The inherited User implementation erases the hash after authentication. */
public abstract class PortalAccount extends User {
    private final long id;

    protected PortalAccount(long id, String email, String hash, boolean enabled, String role) {
        super(email, hash, enabled, true, true, true, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
        this.id = id;
    }

    public long id() { return id; }
    public abstract String landingPage();
}
