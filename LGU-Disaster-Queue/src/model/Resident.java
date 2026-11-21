package model;

public class Resident extends User {
    private String barangay;
    private String householdVulnerability; // e.g., "Senior Citizen", "PWD", "Infant", "None"

    public Resident(String username, String password, String fullName, String contactNumber, String barangay, String householdVulnerability) {
        super(username, password, fullName, contactNumber);
        this.barangay = barangay;
        this.householdVulnerability = householdVulnerability;
    }

    @Override
    public String getRole() {
        return "RESIDENT";
    }

    public String getBarangay() { return barangay; }
    public String getHouseholdVulnerability() { return householdVulnerability; }
}