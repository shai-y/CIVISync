package com.citizen_assistance.lgu.model;

public final class ResidentAccount extends PortalAccount {
    public ResidentAccount(long id, String email, String hash, boolean enabled) {
        super(id, email, hash, enabled, "RESIDENT");
    }

    @Override
    public String landingPage() { return "/resident.html"; }
}
