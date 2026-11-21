package model;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class AssistanceRequest implements Comparable<AssistanceRequest> {
    private static int counter = 1001;

    private String requestId;
    private String residentUsername;
    private String residentName;
    private String emergencyType; // Medical, Rescue, Fire, Food/Water, Evacuation
    private String urgencyLevel;  // Critical, High, Moderate
    private String location;
    private String vulnerability;
    private String details;
    private String status;        // Pending, Dispatched, Resolved
    private int priorityScore;
    private String timestamp;

    public AssistanceRequest(String residentUsername, String residentName, String emergencyType,
                             String urgencyLevel, String location, String vulnerability, String details) {
        this.requestId = "REQ-" + (counter++);
        this.residentUsername = residentUsername;
        this.residentName = residentName;
        this.emergencyType = emergencyType;
        this.urgencyLevel = urgencyLevel;
        this.location = location;
        this.vulnerability = vulnerability;
        this.details = details;
        this.status = "Pending";
        this.timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
        this.priorityScore = calculatePriorityScore();
    }

    // Rules-based priority scoring per project scope note
    private int calculatePriorityScore() {
        int score = 0;

        // 1. Urgency weight
        switch (urgencyLevel.toLowerCase()) {
            case "critical": score += 50; break;
            case "high":     score += 30; break;
            default:         score += 15; break;
        }

        // 2. Emergency type weight
        switch (emergencyType.toLowerCase()) {
            case "medical":
            case "rescue":
            case "fire":       score += 30; break;
            case "evacuation": score += 20; break;
            default:           score += 10; break;
        }

        // 3. Household vulnerability weight
        if (vulnerability != null && !vulnerability.equalsIgnoreCase("None") && !vulnerability.isEmpty()) {
            score += 20;
        }

        return score;
    }

    // Higher priorityScore comes FIRST in the PriorityQueue
    @Override
    public int compareTo(AssistanceRequest other) {
        return Integer.compare(other.priorityScore, this.priorityScore);
    }

    public String getRequestId() { return requestId; }
    public String getResidentUsername() { return residentUsername; }
    public String getResidentName() { return residentName; }
    public String getEmergencyType() { return emergencyType; }
    public String getUrgencyLevel() { return urgencyLevel; }
    public String getLocation() { return location; }
    public String getVulnerability() { return vulnerability; }
    public String getDetails() { return details; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public int getPriorityScore() { return priorityScore; }
    public String getTimestamp() { return timestamp; }
}