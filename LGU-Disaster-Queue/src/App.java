import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import model.*;
import service.QueueManager;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class App {
    private static final QueueManager queueManager = new QueueManager();

    public static void main(String[] args) throws IOException {
        int port = 8080;
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);

        // Serve Frontend UI
        server.createContext("/", exchange -> {
            byte[] response = getHtmlPage().getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "text/html; charset=UTF-8");
            exchange.sendResponseHeaders(200, response.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(response);
            }
        });

        // API: Login
        server.createContext("/api/login", exchange -> {
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) return;
            Map<String, String> params = parseFormBody(exchange);
            User user = queueManager.login(params.get("username"), params.get("password"));
            if (user != null) {
                String json = String.format("{\"success\":true,\"username\":\"%s\",\"fullName\":\"%s\",\"role\":\"%s\",\"vulnerability\":\"%s\"}",
                        escapeJson(user.getUsername()),
                        escapeJson(user.getFullName()),
                        user.getRole(),
                        user instanceof Resident ? escapeJson(((Resident) user).getHouseholdVulnerability()) : "N/A");
                sendJson(exchange, 200, json);
            } else {
                sendJson(exchange, 401, "{\"success\":false,\"message\":\"Invalid credentials\"}");
            }
        });

        // API: Register Resident
        server.createContext("/api/register", exchange -> {
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) return;
            Map<String, String> params = parseFormBody(exchange);
            boolean created = queueManager.registerResident(
                    params.get("username"),
                    params.get("password"),
                    params.get("fullName"),
                    params.get("contact"),
                    params.get("barangay"),
                    params.get("vulnerability")
            );
            if (created) {
                sendJson(exchange, 200, "{\"success\":true}");
            } else {
                sendJson(exchange, 400, "{\"success\":false,\"message\":\"Username already exists\"}");
            }
        });

        // API: Submit Emergency Request
        server.createContext("/api/request", exchange -> {
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) return;
            Map<String, String> params = parseFormBody(exchange);
            AssistanceRequest req = queueManager.submitRequest(
                    params.get("username"),
                    params.get("type"),
                    params.get("urgency"),
                    params.get("location"),
                    params.get("vulnerability"),
                    params.get("details")
            );
            sendJson(exchange, 200, "{\"success\":true,\"requestId\":\"" + req.getRequestId() + "\"}");
        });

        // API: Update Status (Admin)
        server.createContext("/api/status", exchange -> {
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) return;
            Map<String, String> params = parseFormBody(exchange);
            boolean updated = queueManager.updateRequestStatus(params.get("requestId"), params.get("status"));
            sendJson(exchange, 200, "{\"success\":" + updated + "}");
        });

        // API: Post Emergency Notification (Admin)
        server.createContext("/api/notify", exchange -> {
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) return;
            Map<String, String> params = parseFormBody(exchange);
            queueManager.addNotification(params.get("message"));
            sendJson(exchange, 200, "{\"success\":true}");
        });

        // API: Fetch Dashboard Data (Queue, History, Notifications)
        server.createContext("/api/data", exchange -> {
            StringBuilder sb = new StringBuilder("{");
            sb.append("\"queue\":").append(requestsToJson(queueManager.getOrderedActiveQueue())).append(",");
            sb.append("\"history\":").append(requestsToJson(queueManager.getAllHistory())).append(",");
            sb.append("\"notifications\":[");
            List<String> notes = queueManager.getNotifications();
            for (int i = 0; i < notes.size(); i++) {
                sb.append("\"").append(escapeJson(notes.get(i))).append("\"");
                if (i < notes.size() - 1) sb.append(",");
            }
            sb.append("]}");
            sendJson(exchange, 200, sb.toString());
        });

        server.setExecutor(null);
        server.start();
        System.out.println("====================================================");
        System.out.println("LGU Disaster Response Queue System is RUNNING!");
        System.out.println("Open your browser and go to: http://localhost:" + port);
        System.out.println("Default Admin Login:    admin / admin123");
        System.out.println("Default Resident Login: juan / 1234");
        System.out.println("====================================================");
    }

    private static String requestsToJson(List<AssistanceRequest> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            AssistanceRequest r = list.get(i);
            sb.append(String.format(
                "{\"id\":\"%s\",\"username\":\"%s\",\"name\":\"%s\",\"type\":\"%s\",\"urgency\":\"%s\",\"location\":\"%s\",\"vulnerability\":\"%s\",\"details\":\"%s\",\"status\":\"%s\",\"score\":%d,\"time\":\"%s\"}",
                escapeJson(r.getRequestId()), escapeJson(r.getResidentUsername()), escapeJson(r.getResidentName()),
                escapeJson(r.getEmergencyType()), escapeJson(r.getUrgencyLevel()), escapeJson(r.getLocation()),
                escapeJson(r.getVulnerability()), escapeJson(r.getDetails()), escapeJson(r.getStatus()),
                r.getPriorityScore(), escapeJson(r.getTimestamp())
            ));
            if (i < list.size() - 1) sb.append(",");
        }
        sb.append("]");
        return sb.toString();
    }

    private static Map<String, String> parseFormBody(HttpExchange exchange) throws IOException {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> map = new HashMap<>();
        for (String pair : body.split("&")) {
            String[] kv = pair.split("=", 2);
            if (kv.length == 2) {
                map.put(URLDecoder.decode(kv[0], StandardCharsets.UTF_8), URLDecoder.decode(kv[1], StandardCharsets.UTF_8));
            }
        }
        return map;
    }

    private static void sendJson(HttpExchange exchange, int status, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ").replace("\r", "");
    }

    private static String getHtmlPage() {
        return """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>LGU Citizen Assistance & Disaster Response Queue</title>
            <style>
                :root { --primary: #1e3a8a; --danger: #dc2626; --warning: #d97706; --success: #16a34a; --bg: #f1f5f9; }
                body { font-family: 'Segoe UI', Tahoma, sans-serif; background: var(--bg); margin: 0; color: #1e293b; }
                header { background: var(--primary); color: white; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
                header h1 { margin: 0; font-size: 1.25rem; }
                .container { max-width: 1100px; margin: 1.5rem auto; padding: 0 1rem; }
                .card { background: white; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
                .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
                .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem; }
                .stat-box { background: #eff6ff; border-left: 4px solid var(--primary); padding: 1rem; border-radius: 4px; }
                .stat-box h3 { margin: 0; font-size: 1.75rem; color: var(--primary); }
                input, select, textarea, button { width: 100%; padding: 0.6rem; margin-top: 0.4rem; margin-bottom: 0.9rem; border: 1px solid #cbd5e1; border-radius: 5px; box-sizing: border-box; }
                button { background: var(--primary); color: white; font-weight: bold; border: none; cursor: pointer; }
                button:hover { opacity: 0.9; }
                .btn-danger { background: var(--danger); }
                .btn-sm { width: auto; padding: 0.35rem 0.7rem; margin: 0 2px; font-size: 0.85rem; }
                table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 0.9rem; }
                th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
                th { background: #f8fafc; }
                .badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: bold; color: white; }
                .Critical { background: var(--danger); }
                .High { background: var(--warning); }
                .Moderate { background: #2563eb; }
                .Pending { background: #64748b; }
                .Dispatched { background: #d97706; }
                .Resolved { background: var(--success); }
                .alert-banner { background: #fef2f2; border-left: 5px solid var(--danger); padding: 0.8rem 1rem; margin-bottom: 0.5rem; border-radius: 4px; }
                .hidden { display: none; }
            </style>
        </head>
        <body>
            <header>
                <h1>LGU Citizen Assistance & Disaster Response Queue</h1>
                <div id="userBar" class="hidden">
                    <span id="welcomeText" style="margin-right:15px;"></span>
                    <button class="btn-sm btn-danger" onclick="logout()">Logout</button>
                </div>
            </header>

            <div class="container">
                <!-- EMERGENCY NOTIFICATIONS -->
                <div class="card">
                    <h3 style="margin-top:0; color:#dc2626;">Emergency Advisories & Notifications</h3>
                    <div id="notificationsList"></div>
                </div>

                <!-- AUTH SECTION (LOGIN & REGISTER) -->
                <div id="authSection" class="grid-2">
                    <div class="card">
                        <h2>System Login</h2>
                        <form onsubmit="handleLogin(event)">
                            <label>Username</label>
                            <input type="text" id="loginUser" placeholder="e.g., juan or admin" required>
                            <label>Password</label>
                            <input type="password" id="loginPass" placeholder="e.g., 1234 or admin123" required>
                            <button type="submit">Login</button>
                        </form>
                        <small style="color:#64748b;">Demo Accounts: <b>juan / 1234</b> (Resident) | <b>admin / admin123</b> (LGU Staff)</small>
                    </div>

                    <div class="card">
                        <h2>Resident Registration</h2>
                        <form onsubmit="handleRegister(event)">
                            <input type="text" id="regName" placeholder="Full Name" required>
                            <input type="text" id="regUser" placeholder="Choose Username" required>
                            <input type="password" id="regPass" placeholder="Choose Password" required>
                            <input type="text" id="regContact" placeholder="Contact Number (e.g., 0917-xxx-xxxx)" required>
                            <input type="text" id="regBrgy" placeholder="Barangay / Address" required>
                            <label>Household Vulnerability</label>
                            <select id="regVuln">
                                <option value="None">None</option>
                                <option value="Senior Citizen">Senior Citizen</option>
                                <option value="PWD">Person with Disability (PWD)</option>
                                <option value="Pregnant / Infant">Pregnant / Infant</option>
                            </select>
                            <button type="submit">Create Resident Account</button>
                        </form>
                    </div>
                </div>

                <!-- RESIDENT PORTAL -->
                <div id="residentSection" class="hidden">
                    <div class="grid-2">
                        <div class="card">
                            <h2>Submit Emergency Request</h2>
                            <form onsubmit="handleSubmitRequest(event)">
                                <label>Emergency Type</label>
                                <select id="reqType">
                                    <option value="Rescue">Water / Flood Rescue</option>
                                    <option value="Medical">Medical Emergency</option>
                                    <option value="Fire">Fire Incident</option>
                                    <option value="Evacuation">Evacuation Transport</option>
                                    <option value="Food/Water">Relief Goods / Food & Water</option>
                                </select>
                                <label>Urgency Level</label>
                                <select id="reqUrgency">
                                    <option value="Critical">Critical (Life-threatening / Immediate)</option>
                                    <option value="High">High (Urgent assistance needed)</option>
                                    <option value="Moderate">Moderate (Non-life-threatening)</option>
                                </select>
                                <label>Exact Location & Landmarks</label>
                                <input type="text" id="reqLocation" placeholder="Street, Purok, Barangay, Landmark" required>
                                <label>Household Vulnerability</label>
                                <select id="reqVuln">
                                    <option value="None">None</option>
                                    <option value="Senior Citizen">Senior Citizen</option>
                                    <option value="PWD">Person with Disability (PWD)</option>
                                    <option value="Pregnant / Infant">Pregnant / Infant</option>
                                </select>
                                <label>Incident Details</label>
                                <textarea id="reqDetails" rows="3" placeholder="Describe number of people, floor level, injuries, etc." required></textarea>
                                <button type="submit" class="btn-danger">Submit Emergency Request</button>
                            </form>
                        </div>

                        <div class="card">
                            <h2>My Request Tracking</h2>
                            <table>
                                <thead>
                                    <tr><th>ID</th><th>Type</th><th>Score</th><th>Status</th></tr>
                                </thead>
                                <tbody id="residentHistoryTable"></tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- ADMIN / RESPONSE TEAM DASHBOARD -->
                <div id="adminSection" class="hidden">
                    <div class="grid-3">
                        <div class="stat-box"><small>Total Requests</small><h3 id="statTotal">0</h3></div>
                        <div class="stat-box"><small>Active in Priority Queue</small><h3 id="statActive">0</h3></div>
                        <div class="stat-box"><small>Resolved Cases</small><h3 id="statResolved">0</h3></div>
                    </div>

                    <div class="card">
                        <h2>Broadcast Emergency Notification</h2>
                        <form onsubmit="handlePostNotification(event)" style="display:flex; gap:10px;">
                            <input type="text" id="newAlertMsg" placeholder="Type official LGU weather or evacuation advisory..." required style="margin:0;">
                            <button type="submit" style="width:200px; margin:0;">Broadcast Alert</button>
                        </form>
                    </div>

                    <div class="card">
                        <h2>Active Disaster Response Priority Queue (Ranked Highest First)</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Priority</th><th>ID</th><th>Resident</th><th>Type</th>
                                    <th>Location & Vulnerability</th><th>Status</th><th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="adminQueueTable"></tbody>
                        </table>
                    </div>

                    <div class="card">
                        <h2>Complete Reports & Request History</h2>
                        <table>
                            <thead>
                                <tr><th>ID</th><th>Time</th><th>Resident</th><th>Type</th><th>Urgency</th><th>Location</th><th>Status</th></tr>
                            </thead>
                            <tbody id="adminHistoryTable"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <script>
                let currentUser = null;

                async function fetchSystemData() {
                    const res = await fetch('/api/data');
                    const data = await res.json();

                    // Render Notifications
                    const notifDiv = document.getElementById('notificationsList');
                    notifDiv.innerHTML = data.notifications.map(n => `<div class="alert-banner">${n}</div>`).join('');

                    if (!currentUser) return;

                    if (currentUser.role === 'RESIDENT') {
                        const myReqs = data.history.filter(r => r.username === currentUser.username);
                        document.getElementById('residentHistoryTable').innerHTML = myReqs.map(r => `
                            <tr>
                                <td><b>${r.id}</b></td>
                                <td>${r.type}<br><small>${r.location}</small></td>
                                <td>${r.score}</td>
                                <td><span class="badge ${r.status}">${r.status}</span></td>
                            </tr>
                        `).join('');
                    } else if (currentUser.role === 'ADMIN') {
                        document.getElementById('statTotal').innerText = data.history.length;
                        document.getElementById('statActive').innerText = data.queue.length;
                        document.getElementById('statResolved').innerText = data.history.filter(r => r.status === 'Resolved').length;

                        document.getElementById('adminQueueTable').innerHTML = data.queue.map(r => `
                            <tr>
                                <td><span class="badge ${r.urgency}">${r.score} pts (${r.urgency})</span></td>
                                <td><b>${r.id}</b></td>
                                <td>${r.name}</td>
                                <td>${r.type}</td>
                                <td>${r.location}<br><small>Vulnerability: <b>${r.vulnerability}</b> | ${r.details}</small></td>
                                <td><span class="badge ${r.status}">${r.status}</span></td>
                                <td>
                                    <button class="btn-sm" onclick="updateStatus('${r.id}', 'Dispatched')">Dispatch</button>
                                    <button class="btn-sm" style="background:#16a34a;" onclick="updateStatus('${r.id}', 'Resolved')">Resolve</button>
                                </td>
                            </tr>
                        `).join('');

                        document.getElementById('adminHistoryTable').innerHTML = data.history.map(r => `
                            <tr>
                                <td>${r.id}</td><td>${r.time}</td><td>${r.name}</td>
                                <td>${r.type}</td><td>${r.urgency}</td><td>${r.location}</td>
                                <td><span class="badge ${r.status}">${r.status}</span></td>
                            </tr>
                        `).join('');
                    }
                }

                async function handleLogin(e) {
                    e.preventDefault();
                    const body = new URLSearchParams({
                        username: document.getElementById('loginUser').value,
                        password: document.getElementById('loginPass').value
                    });
                    const res = await fetch('/api/login', { method: 'POST', body });
                    const data = await res.json();
                    if (data.success) {
                        currentUser = data;
                        document.getElementById('authSection').classList.add('hidden');
                        document.getElementById('userBar').classList.remove('hidden');
                        document.getElementById('welcomeText').innerText = `Logged in as: ${data.fullName} (${data.role})`;
                        if (data.role === 'RESIDENT') {
                            document.getElementById('residentSection').classList.remove('hidden');
                            document.getElementById('reqVuln').value = data.vulnerability;
                        } else {
                            document.getElementById('adminSection').classList.remove('hidden');
                        }
                        fetchSystemData();
                    } else {
                        alert(data.message);
                    }
                }

                async function handleRegister(e) {
                    e.preventDefault();
                    const body = new URLSearchParams({
                        fullName: document.getElementById('regName').value,
                        username: document.getElementById('regUser').value,
                        password: document.getElementById('regPass').value,
                        contact: document.getElementById('regContact').value,
                        barangay: document.getElementById('regBrgy').value,
                        vulnerability: document.getElementById('regVuln').value
                    });
                    const res = await fetch('/api/register', { method: 'POST', body });
                    const data = await res.json();
                    if (data.success) {
                        alert('Registration successful! You may now log in.');
                        e.target.reset();
                    } else {
                        alert(data.message);
                    }
                }

                async function handleSubmitRequest(e) {
                    e.preventDefault();
                    const body = new URLSearchParams({
                        username: currentUser.username,
                        type: document.getElementById('reqType').value,
                        urgency: document.getElementById('reqUrgency').value,
                        location: document.getElementById('reqLocation').value,
                        vulnerability: document.getElementById('reqVuln').value,
                        details: document.getElementById('reqDetails').value
                    });
                    const res = await fetch('/api/request', { method: 'POST', body });
                    const data = await res.json();
                    if (data.success) {
                        alert('Emergency Request Submitted! Tracking ID: ' + data.requestId);
                        e.target.reset();
                        fetchSystemData();
                    }
                }

                async function updateStatus(requestId, status) {
                    const body = new URLSearchParams({ requestId, status });
                    await fetch('/api/status', { method: 'POST', body });
                    fetchSystemData();
                }

                async function handlePostNotification(e) {
                    e.preventDefault();
                    const body = new URLSearchParams({ message: document.getElementById('newAlertMsg').value });
                    await fetch('/api/notify', { method: 'POST', body });
                    document.getElementById('newAlertMsg').value = '';
                    fetchSystemData();
                }

                function logout() {
                    currentUser = null;
                    document.getElementById('authSection').classList.remove('hidden');
                    document.getElementById('userBar').classList.add('hidden');
                    document.getElementById('residentSection').classList.add('hidden');
                    document.getElementById('adminSection').classList.add('hidden');
                }

                // Initial load & auto-refresh every 5 seconds
                fetchSystemData();
                setInterval(fetchSystemData, 5000);
            </script>
        </body>
        </html>
        """;
    }
}