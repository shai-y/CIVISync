package model;

public abstract class User {
    private String username;
    private String password;
    private String fullName;
    private String contactNumber;

    public User(String username, String password, String fullName, String contactNumber) {
        this.username = username;
        this.password = password;
        this.fullName = fullName;
        this.contactNumber = contactNumber;
    }

    // Abstract method demonstrating Abstraction & Polymorphism
    public abstract String getRole();

    public boolean checkPassword(String inputPassword) {
        return this.password.equals(inputPassword);
    }

    public String getUsername() { return username; }
    public String getFullName() { return fullName; }
    public String getContactNumber() { return contactNumber; }
}