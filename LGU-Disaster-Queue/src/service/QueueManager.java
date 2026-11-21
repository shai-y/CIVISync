package service;

import model.*;
import java.util.*;

public class QueueManager {
    private HashMap<String, User> users = new HashMap<>();
    private PriorityQueue<AssistanceRequest> activeQueue = new PriorityQueue<>();
    private ArrayList<AssistanceRequest> allRequestsHistory = new ArrayList<>();
    private LinkedList<String> notifications = new LinkedList<>();

    public QueueManager() {
        // Seed default accounts for immediate testing
        users.put("admin", new Admin("admin", "admin123", "LGU Command Center", "0917-000-0001", "CDRRMO"));
        users.put("juan", new Resident("juan", "1234", "Juan Dela Cruz", "0917-123-4567", "Brgy. Poblacion", "Senior Citizen"));

        // Seed initial notification & sample request
        addNotification("ADVISORY: Typhoon Signal No. 2 raised. Evacuation centers at Brgy. Covered Courts are open.");
        submitRequest("juan", "Rescue", "Critical", "Purok 3, Brgy. Poblacion (Near River)", "Senior Citizen", "Floodwater rising rapidly inside house.");
    }

    public boolean registerResident(String username, String password, String fullName, String contact, String barangay, String vulnerability) {
        if (users.containsKey(username)) {
            return false;
        }
        users.put(username, new Resident(username, password, fullName, contact, barangay, vulnerability));
        return true;
    }

    public User login(String username, String password) {
        User u = users.get(username);
        if (u != null && u.checkPassword(password)) {
            return u;
        }
        return null;
    }

    public AssistanceRequest submitRequest(String username, String type, String urgency, String location, String vulnerability, String details) {
        User u = users.get(username);
        String fullName = (u != null) ? u.getFullName() : username;

        if ((vulnerability == null || vulnerability.isEmpty()) && u instanceof Resident) {
            vulnerability = ((Resident) u).getHouseholdVulnerability();
        }

        AssistanceRequest req = new AssistanceRequest(username, fullName, type, urgency, location, vulnerability, details);
        activeQueue.offer(req);
        allRequestsHistory.add(req);
        return req;
    }

    public boolean updateRequestStatus(String requestId, String newStatus) {
        for (AssistanceRequest req : allRequestsHistory) {
            if (req.getRequestId().equals(requestId)) {
                req.setStatus(newStatus);
                if (newStatus.equalsIgnoreCase("Resolved")) {
                    activeQueue.remove(req);
                }
                return true;
            }
        }
        return false;
    }

    public void addNotification(String message) {
        notifications.addFirst(message);
        if (notifications.size() > 10) {
            notifications.removeLast();
        }
    }

    // Returns active queue sorted strictly by Priority Score
    public List<AssistanceRequest> getOrderedActiveQueue() {
        List<AssistanceRequest> ordered = new ArrayList<>();
        PriorityQueue<AssistanceRequest> copy = new PriorityQueue<>(activeQueue);
        while (!copy.isEmpty()) {
            ordered.add(copy.poll());
        }
        return ordered;
    }

    public List<AssistanceRequest> getAllHistory() {
        return allRequestsHistory;
    }

    public List<String> getNotifications() {
        return notifications;
    }
}