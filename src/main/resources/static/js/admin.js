async function api(path, {method = "GET", data} = {}) {
    const headers = {Accept: "application/json"};
    let body;
    if (method !== "GET") {
        const tokenResponse = await fetch("/api/csrf", {cache: "no-store"});
        if (!tokenResponse.ok) throw Error("Could not start a secure session. Refresh and try again.");
        const csrf = await tokenResponse.json();
        headers[csrf.header] = csrf.token;
        if (data instanceof URLSearchParams) body = data;
        else if (data !== undefined) {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify(data);
        }
    }
    const response = await fetch(path, {method, headers, body, cache: "no-store"});
    if (!response.ok) {
        if (response.status === 401 && path !== "/api/login") location.assign("/login.html");
        const error = await response.json().catch(() => ({}));
        const fallback = {401: "Check your sign-in details or contact the LGU about account access.",
            403: "Access denied. Sign in again with the appropriate account.",
            409: "The record changed. Refresh and try again."};
        throw Error(error.message || fallback[response.status] || "The server could not complete this action.");
    }
    const type = response.headers.get("content-type") || "";
    return type.includes("application/json") ? response.json() : response.text();
}

const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
};
function showMessage(text) { document.querySelector("#feedback").textContent = text; }
async function logout(event) {
    event.preventDefault();
    try { await api("/api/logout", {method:"POST"}); location.replace("/login.html"); }
    catch (error) { showMessage(error.message); }
}
function renderNotices(container, notices) {
    container.replaceChildren();
    if (!notices.length) container.append(el("p", "No announcements yet."));
    for (const notice of notices) {
        const card = el("article", null, "admin-announcement-card");
        card.append(el("small", notice.category + " · " + notice.author), el("h3", notice.title), el("p", notice.message));
        container.append(card);
    }
}

const $ = selector => document.querySelector(selector);
let dashboard;
const dateLabel = raw => raw ? new Date(raw).toLocaleString("en-PH") : "—";
const ref = id => "REQ-" + id;
const formData = form => Object.fromEntries(new FormData(form));
function button(label, action) {
    const b = el("button", label, "admin-button admin-button--secondary");
    b.type = "button";
    b.onclick = action;
    return b;
}
function choice(label, items, selected) {
    const control = el("select", null, "admin-select");
    control.setAttribute("aria-label", label);
    for (const [value,text] of items) control.add(new Option(text, value));
    control.value = String(selected ?? "");
    return control;
}
function addRow(body, ...items) {
    const row = body.insertRow();
    for (const item of items) {
        const cell = row.insertCell();
        if (item instanceof Node) cell.append(item);
        else cell.textContent = item ?? "";
    }
}
function emptyTable(body, columns) {
    const cell = body.insertRow().insertCell();
    cell.colSpan = columns;
    cell.textContent = "No matching records.";
}
async function save(control, path, method, data, message, afterSave) {
    control.disabled = true;
    try {
        await api(path, {method,data});
        if (afterSave) afterSave();
        showMessage(message);
        try { await loadDashboard(); }
        catch { showMessage(message + " Reload the dashboard to see the latest data."); }
    } catch (error) { showMessage(error.message); }
    finally { control.disabled = false; }
}
function renderQueue() {
    if (!dashboard) return;
    const body = $("#requestTable tbody");
    body.replaceChildren();
    const query = $("#requestSearch").value.trim().toLowerCase();
    const filter = $("#requestStatusFilter").value;
    for (const r of dashboard.requests) {
        const search = [ref(r.id),r.resident,r.category,r.location,r.details,r.teamName].join(" ").toLowerCase();
        if (!search.includes(query) || (filter !== "all" && r.status.toLowerCase() !== filter)) continue;
        const summary = el("div",null,"request-cell");
        summary.append(el("strong",ref(r.id)),el("b",r.category),el("span",r.location),el("p",r.details));
        const statuses = ["Pending","Verified","Assigned","In progress","Resolved"];
        const status = choice("Status for " + ref(r.id),statuses.map(x => [x,x]),r.status);
        const priorities = ["Low","Medium","High","Critical"];
        const priority = choice("Priority for " + ref(r.id),priorities.map(x => [x,x]),r.priority);
        const busy = new Set(dashboard.requests.filter(other => other.id !== r.id && other.teamId != null).map(other => other.teamId));
        const options = dashboard.teams.filter(t => !busy.has(t.id)).map(t => [t.id,t.name]);
        const team = choice("Team for " + ref(r.id),[["","Unassigned"],...options],r.teamId);
        team.onchange = () => {
            if (team.value && !["Assigned","In progress"].includes(status.value)) status.value = "Assigned";
            if (!team.value && ["Assigned","In progress"].includes(status.value)) status.value = "Verified";
        };
        status.onchange = () => { if (["Pending","Verified","Resolved"].includes(status.value)) team.value = ""; };
        const note = el("textarea");
        note.value = r.note;
        note.maxLength = 500;
        note.placeholder = "Update for resident";
        note.setAttribute("aria-label","Resident update for " + ref(r.id));
        const changes = el("div",null,"live-review");
        const commit = button("Save update", () => save(commit,"/api/staff/requests/"+r.id,"PUT",{
            revision:r.revision, priority:priority.value, status:status.value,
            teamId:team.value ? Number(team.value) : null, note:note.value
        },"Saved " + ref(r.id) + "."));
        changes.append(status,note,commit);
        addRow(body,summary,r.resident,dateLabel(r.filed),priority,team,changes);
    }
    if (!body.rows.length) emptyTable(body,6);
}
function renderTeams() {
    const grid = $(".admin-team-grid");
    const add = $("[data-open-team-form]");
    grid.replaceChildren(add);
    for (const t of dashboard.teams) {
        const active = dashboard.requests.find(r => r.teamId === t.id);
        const card = el("article",null,"admin-team-card");
        card.append(el("h2",t.name),el("p",t.category),el("p","Leader · " + t.leader),
            el("p","Members · " + t.members),el("strong",active ? "Deployed · "+ref(active.id) : "Available"));
        const action = button(active ? "Recall team" : "Assign to a request", () => {
            if (!active) {
                $("#requestSearch").value = "";
                $("#requestStatusFilter").value = "all";
                $('[data-view-target="request-queue"]').click();
                renderQueue();
                showMessage("Choose " + t.name + " in the Team column, then save the request.");
                return;
            }
            if (!confirm("Recall " + t.name + " from " + ref(active.id) + "?")) return;
            save(action,"/api/staff/requests/"+active.id,"PUT",{revision:active.revision,
                status:"Verified", priority:active.priority, teamId:null, note:active.note},"Team recalled.");
        });
        card.append(action);
        grid.insertBefore(card,add);
    }
}
function renderAccounts() {
    if (!dashboard) return;
    const query = $("#accountSearch").value.toLowerCase().trim();
    const body = $("#accountsTable tbody");
    body.replaceChildren();
    for (const a of dashboard.accounts) {
        if (![a.name,a.email,a.barangay].join(" ").toLowerCase().includes(query)) continue;
        const identity = el("div",null,"account-cell");
        identity.append(el("strong",a.name),el("span",a.email));
        const active = Number(a.active) === 1;
        const label = active ? "Suspend" : "Activate";
        const action = button(label, () => {
            if (confirm(label + " access for " + a.name + "?"))
                save(action,"/api/staff/accounts/"+a.id,"PUT",{enabled:!active},"Resident access updated.");
        });
        addRow(body,identity,a.barangay,dateLabel(a.joined),active ? "Active" : "Suspended",action);
    }
    if (!body.rows.length) emptyTable(body,5);
}
function renderActivity() {
    if (!dashboard) return;
    const query = $("#activitySearch").value.toLowerCase().trim();
    const body = $("#activityTable tbody");
    body.replaceChildren();
    for (const a of dashboard.activity) {
        if ([a.actor,a.action,a.recordLabel].join(" ").toLowerCase().includes(query))
            addRow(body,a.action,a.actor,a.recordLabel,dateLabel(a.logged));
    }
    $("#activityEmptyState").hidden = dashboard.activity.length > 0;
    if (!body.rows.length && dashboard.activity.length) emptyTable(body,4);
}
function renderReport() {
    const {report,month} = dashboard;
    const values = [report.today,report.averageMinutes == null ? "—" : report.averageMinutes+" min",report.resolvedWeek,report.criticalPending];
    document.querySelectorAll("#view-reports .admin-stat-card__value").forEach((x,i) => x.textContent = values[i]);
    for (const [field,selector] of [["category","#categoryTotals"],["barangay",".admin-breakdown-list:not(#categoryTotals)"]]) {
        const totals = new Map();
        for (const r of month) totals.set(r[field],(totals.get(r[field]) || 0) + Number(r.total));
        const list = $(selector);
        list.replaceChildren();
        if (!totals.size) list.append(el("p","No requests filed this month."));
        for (const [name,count] of totals) list.append(el("p",name + " · " + count));
    }
}
function exportCsv() {
    if (!dashboard) return;
    const rows = [["Reference","Category","Resident","Barangay","Status","Priority","Team","Filed"]];
    for (const r of dashboard.requests) rows.push([ref(r.id),r.category,r.resident,r.barangay,r.status,r.priority,r.teamName,r.filed]);
    const csvCell = raw => {
        let value = String(raw ?? "");
        if (/^[\s]*[=+@-]|^[\t\r\n]/.test(value)) value = "'" + value;
        return '"' + value.replaceAll('"','""') + '"';
    };
    const blob = new Blob(["\uFEFF",rows.map(row => row.map(csvCell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const link = el("a");
    link.href = url;
    link.download = "municipal-request-queue.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
}
async function loadDashboard() {
    dashboard = await api("/api/staff/dashboard");
    const name = dashboard.profile.name;
    $("#adminDisplayName").textContent = name;
    $(".admin-profile__avatar").textContent = name.split(/\s+/).slice(0,2).map(x => x[0]).join("");
    const requests = dashboard.requests;
    const counts = [requests.filter(r => r.status === "Pending").length,
        requests.filter(r => r.priority === "Critical" && r.status !== "Resolved").length,
        requests.filter(r => r.status === "In progress").length];
    document.querySelectorAll("#view-request-queue .admin-stat-card__value").forEach((e,i) => e.textContent = counts[i]);
    $(".admin-nav__count").textContent = counts[0];
    $(".admin-section-heading__count").textContent = dashboard.notices.length + " published";
    renderNotices($("#liveNotices"),dashboard.notices);
    renderQueue(); renderTeams(); renderAccounts(); renderActivity(); renderReport();
}
$(".admin-profile__signout").onclick = logout;
$("#refreshQueue").onclick = async event => {
    const trigger = event.currentTarget;
    trigger.disabled = true;
    try { await loadDashboard(); showMessage("Queue refreshed."); }
    catch (error) { showMessage(error.message); }
    finally { trigger.disabled = false; }
};
$("#requestSearch").oninput = renderQueue;
$("#requestStatusFilter").onchange = renderQueue;
$("#accountSearch").oninput = renderAccounts;
$("#activitySearch").oninput = renderActivity;
$("#exportReportsButton").onclick = exportCsv;
$("[data-open-team-form]").onclick = () => { $("#teamFormPanel").hidden = false; $("#teamForm input").focus(); };
$("[data-close-team-form]").onclick = () => { $("#teamFormPanel").hidden = true; };
$("#teamForm").onsubmit = e => {
    e.preventDefault();
    const data = formData(e.target);
    data.teamMembers = Number(data.teamMembers);
    save(e.submitter,"/api/staff/teams","POST",data,"Response team registered.",() => {
        e.target.reset(); $("#teamFormPanel").hidden = true;
    });
};
$("#announcementForm").onsubmit = e => {
    e.preventDefault();
    save(e.submitter,"/api/staff/notices","POST",formData(e.target),"Announcement published.",() => e.target.reset());
};
const liveNotices = el("div");
liveNotices.id = "liveNotices";
$(".admin-announcements-list").append(liveNotices);
loadDashboard().catch(error => showMessage(error.message));

// Preserve the original dashboard section reveal.
(() => {
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;
        function addRevealStyles() {
            if (document.getElementById("adminRevealStyles")) {
                return;
            }
            const style = document.createElement("style");
            style.id = "adminRevealStyles";
            style.textContent = `
                [hidden] {
                    display: none !important;
                }
                .admin-scroll-reveal {
                    opacity: 0;
                    transform: translateY(18px);
                    transition:
                        opacity .65s ease,
                        transform .65s cubic-bezier(.2,.65,.3,1);
                }
                .admin-scroll-reveal.is-revealed {
                    opacity: 1;
                    transform: translateY(0);
                }
                @media(prefers-reduced-motion:reduce) {
                    .admin-scroll-reveal {
                        opacity: 1 !important;
                        transform: none !important;
                        transition: none !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        let revealObserver = null;
        if (
            !reduceMotion &&
            "IntersectionObserver" in window
        ) {
            addRevealStyles();
            revealObserver = new IntersectionObserver(
                (entries, observer) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add(
                                "is-revealed"
                            );
                            observer.unobserve(entry.target);
                        }
                    });
                },
                {
                    threshold: 0.08,
                    rootMargin: "0px 0px -25px 0px"
                }
            );
        }
        function observeActiveView(view) {
            if (!view) return;
            const targets = $$(
                `
                .admin-page-heading,
                .admin-stat-card,
                .admin-panel,
                .admin-team-card,
                .admin-announcement-card,
                .admin-reports-grid > section,
                .admin-footer
                `,
                view
            );
            targets.forEach((element, index) => {
                if (element.dataset.revealReady === "true") {
                    return;
                }
                element.dataset.revealReady = "true";
                if (reduceMotion || !revealObserver) {
                    element.classList.add("is-revealed");
                    return;
                }
                element.classList.add(
                    "admin-scroll-reveal"
                );
                element.style.transitionDelay =
                    `${Math.min(index % 4, 3) * 70}ms`;
                revealObserver.observe(element);
            });
        }
        function observeVisibleView() {
            const activeView = $(
                ".admin-view.is-active:not([hidden])"
            );
            observeActiveView(activeView);
        }
        /* Initial reveal */
        observeVisibleView();
        /* Re-check when switching sidebar sections */
        $$("[data-view-target]").forEach((button) => {
            button.addEventListener("click", () => {
                window.setTimeout(
                    observeVisibleView,
                    60
                );
            });
        });
})();
