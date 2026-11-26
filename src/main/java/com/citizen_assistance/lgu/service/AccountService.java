package com.citizen_assistance.lgu.service;

import com.citizen_assistance.lgu.model.*;
import java.util.Locale;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AccountService implements UserDetailsService {
    private final JdbcTemplate db;
    private final PasswordEncoder encoder;

    public AccountService(JdbcTemplate db, PasswordEncoder encoder) {
        this.db = db;
        this.encoder = encoder;
    }

    @Override
    public PortalAccount loadUserByUsername(String login) {
        String identifier = login.strip().toLowerCase(Locale.ROOT);
        return db.query("SELECT id,email,password_hash,enabled,role FROM accounts WHERE email=? OR mobile=?", (rs, row) -> {
            long id = rs.getLong("id");
            String email = rs.getString("email"), hash = rs.getString("password_hash");
            boolean enabled = rs.getBoolean("enabled");
            return switch (rs.getString("role")) {
                case "RESIDENT" -> new ResidentAccount(id, email, hash, enabled);
                case "STAFF" -> new StaffAccount(id, email, hash, enabled);
                default -> throw new UsernameNotFoundException("Unknown account role");
            };
        }, identifier, identifier).stream().findFirst().orElseThrow(() -> new UsernameNotFoundException("Account unavailable"));
    }

    public boolean hasCurrentRole(long id, String role) {
        return Boolean.TRUE.equals(db.queryForObject("SELECT COUNT(*) > 0 FROM accounts WHERE id=? AND role=? AND enabled=TRUE",
            Boolean.class, id, role));
    }

    public void register(Forms.Registration form) {
        if (!form.password().equals(form.confirmPassword())) throw new IllegalArgumentException("Passwords must match.");
        db.update("INSERT INTO accounts(full_name,email,mobile,barangay,password_hash) VALUES (?,?,?,?,?)",
            form.fullName().strip(), form.email().strip().toLowerCase(Locale.ROOT), form.mobileNumber(),
            form.barangay().strip(), encoder.encode(form.password()));
    }
}
