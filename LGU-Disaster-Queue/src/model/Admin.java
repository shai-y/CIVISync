package model;

public class Admin extends User {
    private String department;

    public Admin(String username, String password, String fullName, String contactNumber, String department) {
        super(username, password, fullName, contactNumber);
        this.department = department;
    }

    @Override
    public String getRole() {
        return "ADMIN";
    }

    public String getDepartment() { return department; }
}