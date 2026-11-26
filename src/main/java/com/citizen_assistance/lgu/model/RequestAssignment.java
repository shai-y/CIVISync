package com.citizen_assistance.lgu.model;

import java.util.Set;

/** Active team assignment and workflow status are updated together. */
public record RequestAssignment(String status, Long teamId) {
    private static final Set<String> STATES = Set.of("Pending", "Verified", "Assigned", "In progress", "Resolved");

    public RequestAssignment {
        if (status == null || !STATES.contains(status)) {
            throw new IllegalArgumentException("Choose a valid request status.");
        }
        if (status.equals("Resolved")) {
            teamId = null;
        } else if (status.equals("Assigned") || status.equals("In progress")) {
            if (teamId == null) throw new IllegalArgumentException("Choose a team for this status.");
        } else if (teamId != null) {
            throw new IllegalArgumentException("Choose Assigned or In progress when assigning a team.");
        }
    }
}
