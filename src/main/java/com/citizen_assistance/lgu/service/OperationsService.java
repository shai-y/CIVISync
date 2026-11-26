package com.citizen_assistance.lgu.service;

import com.citizen_assistance.lgu.model.Forms;
import com.citizen_assistance.lgu.model.RequestAssignment;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@Service
public class OperationsService {
    private final JdbcTemplate db;

    public OperationsService(JdbcTemplate db) { this.db = db; }

    private static final String REQUESTS = """
        SELECT r.id,r.category,r.location,r.details,r.status,r.priority,r.note,r.team_id AS teamId,
               r.revision,r.filed,t.name AS teamName,a.full_name AS resident,a.barangay
        FROM requests r JOIN accounts a ON a.id=r.owner_id LEFT JOIN teams t ON t.id=r.team_id
        """;

    public Map<String,Object> profile(long id) {
        return db.queryForMap("SELECT full_name AS name,email,mobile,barangay FROM accounts WHERE id=?", id);
    }

    public List<Map<String,Object>> notices() {
        return db.queryForList("""
            SELECT n.id,n.title,n.category,n.message,n.posted,a.full_name AS author
            FROM notices n JOIN accounts a ON a.id=n.author_id ORDER BY n.id DESC
            """);
    }

    @Transactional(readOnly=true)
    public Map<String,Object> residentDashboard(long id) {
        return Map.of("profile", profile(id), "requests", db.queryForList(REQUESTS + " WHERE r.owner_id=? ORDER BY r.id DESC", id),
            "notices", notices());
    }

    @Transactional
    public Map<String,Object> file(long owner, Forms.Filing form) {
        // Unique per resident and submission, so a network retry returns the same reference.
        db.update("""
            INSERT INTO requests(owner_id,submission,category,location,details) VALUES (?,?,?,?,?)
            ON DUPLICATE KEY UPDATE id=id
            """, owner, form.submission().toString(), form.category(), form.location().strip(), form.details().strip());
        var saved = db.queryForMap("SELECT id,category,location,details FROM requests WHERE owner_id=? AND submission=?",
            owner, form.submission().toString());
        if (!form.category().equals(saved.get("category")) || !form.location().strip().equals(saved.get("location"))
                || !form.details().strip().equals(saved.get("details"))) {
            throw new ResponseStatusException(CONFLICT, "This submission was already used for a different request.");
        }
        return Map.of("id", saved.get("id"));
    }

    @Transactional(readOnly=true)
    public Map<String,Object> staffDashboard(long actor) {
        return Map.of("profile", profile(actor), "requests", db.queryForList(REQUESTS + " ORDER BY r.id DESC"),
            "teams", db.queryForList("SELECT id,name,category,leader,members FROM teams ORDER BY name"),
            "notices", notices(), "accounts", db.queryForList("""
                SELECT id,full_name AS name,email,barangay,joined,CASE WHEN enabled THEN 1 ELSE 0 END AS active
                FROM accounts WHERE role='RESIDENT' ORDER BY full_name
                """),
            "activity", db.queryForList("""
                SELECT l.action,l.record_label AS recordLabel,l.logged,a.full_name AS actor FROM activity l
                JOIN accounts a ON a.id=l.actor_id ORDER BY l.id DESC
                """), "report", db.queryForMap("""
                SELECT COUNT(CASE WHEN DATE(filed)=CURRENT_DATE THEN 1 END) AS today,
                ROUND(AVG(TIMESTAMPDIFF(MINUTE,filed,responded))) AS averageMinutes,
                COUNT(CASE WHEN YEARWEEK(resolved,3)=YEARWEEK(CURRENT_DATE,3) THEN 1 END) AS resolvedWeek,
                COUNT(CASE WHEN priority='Critical' AND status='Pending' THEN 1 END) AS criticalPending
                FROM requests
                """), "month", db.queryForList("""
                SELECT r.category,a.barangay,COUNT(*) AS total FROM requests r JOIN accounts a ON a.id=r.owner_id
                WHERE EXTRACT(YEAR_MONTH FROM r.filed)=EXTRACT(YEAR_MONTH FROM CURRENT_DATE)
                GROUP BY r.category,a.barangay ORDER BY r.category,a.barangay
                """));
    }

    private void log(long actor, String action, String record) {
        db.update("INSERT INTO activity(actor_id,action,record_label) VALUES (?,?,?)", actor, action, record);
    }

    @Transactional
    public void review(long actor, long request, Forms.Review form) {
        var assignment = new RequestAssignment(form.status(), form.teamId());
        int changed = db.update("""
            UPDATE requests SET priority=?,team_id=?,note=?,revision=revision+1,
            responded=CASE WHEN responded IS NULL AND ? <> 'Pending' THEN CURRENT_TIMESTAMP ELSE responded END,
            resolved=CASE WHEN ?='Resolved' THEN COALESCE(resolved,CURRENT_TIMESTAMP) ELSE NULL END,
            status=? WHERE id=? AND revision=?
            """, form.priority(), assignment.teamId(), form.note().strip(), assignment.status(),
            assignment.status(), assignment.status(), request, form.revision());
        if (changed != 1) throw new ResponseStatusException(CONFLICT, "The request has changed. Refresh the queue and review it again.");
        log(actor, "Reviewed request · " + assignment.status(), "REQ-" + request);
    }

    @Transactional
    public void addTeam(long actor, Forms.Team team) {
        db.update("INSERT INTO teams(name,category,leader,members) VALUES(?,?,?,?)",
            team.teamName().strip(), team.teamCategory().strip(), team.teamLeader().strip(), team.teamMembers());
        log(actor, "Registered response team", team.teamName().strip());
    }

    @Transactional
    public void publish(long actor, Forms.Notice notice) {
        db.update("INSERT INTO notices(author_id,title,category,message) VALUES(?,?,?,?)",
            actor, notice.title().strip(), notice.category(), notice.message().strip());
        log(actor, "Published announcement", notice.title().strip());
    }

    @Transactional
    public void access(long actor, long resident, boolean enabled) {
        int changed = db.update("UPDATE accounts SET enabled=? WHERE id=? AND role='RESIDENT' AND enabled<>?",
            enabled, resident, enabled);
        if (changed == 1) log(actor, enabled ? "Activated resident" : "Suspended resident", "Account " + resident);
        else if (db.queryForObject("SELECT COUNT(*) FROM accounts WHERE id=? AND role='RESIDENT'", Integer.class, resident) == 0)
            throw new ResponseStatusException(NOT_FOUND, "Resident not found.");
    }
}
