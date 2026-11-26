package com.citizen_assistance.lgu.model;

public final class StaffAccount extends PortalAccount {
    public StaffAccount(long id, String email, String hash, boolean enabled) {
        super(id, email, hash, enabled, "STAFF");
    }

    @Override
    public String landingPage() { return "/admin.html"; }
}
