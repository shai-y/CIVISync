
/* =========================================================
   LGU ASSIST — ADMIN DASHBOARD INTERACTIONS

   Frontend demonstration only.
   Connect these handlers to the Java backend before
   using real resident or emergency data.
========================================================= */

(() => {
    "use strict";

    document.addEventListener("DOMContentLoaded", () => {

        const ADMIN_NAME =
            document.getElementById("adminDisplayName")
                ?.textContent.trim() || "Administrator";

        const requestTable = document.getElementById("requestTable");
        const accountsTable = document.getElementById("accountsTable");
        const activityTable = document.getElementById("activityTable");
        const activityEmptyState =
            document.getElementById("activityEmptyState");

        const dialog = document.getElementById("adminDialog");
        const dialogForm = dialog?.querySelector("form");
        const dialogTitle = document.getElementById("adminDialogTitle");
        const dialogMessage = document.getElementById("adminDialogMessage");
        const dialogConfirm = document.getElementById("adminDialogConfirm");

        let pendingDialogAction = null;


        /* =====================================================
           1. SMALL UTILITIES
        ===================================================== */

        const $ = (selector, root = document) =>
            root.querySelector(selector);

        const $$ = (selector, root = document) =>
            Array.from(root.querySelectorAll(selector));


        function escapeHTML(value) {

            return String(value).replace(/[&<>"']/g, (character) => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[character]);

        }


        function currentTimestamp() {

            return new Date().toLocaleString("en-PH", {
                year: "numeric",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
            });

        }


        /* =====================================================
           2. NOTIFICATION TOAST
        ===================================================== */

        function toast(message, type = "success") {

            let region = document.getElementById("adminToastRegion");

            if (!region) {

                region = document.createElement("div");

                region.id = "adminToastRegion";
                region.className = "admin-toast-region";

                region.setAttribute("aria-live", "polite");
                region.setAttribute("aria-atomic", "true");

                document.body.appendChild(region);


                const style = document.createElement("style");

                style.textContent = `
                    .admin-toast-region {
                        position: fixed;
                        right: 24px;
                        bottom: 24px;
                        z-index: 3000;
                        display: grid;
                        gap: 10px;
                        width: min(360px, calc(100vw - 32px));
                        pointer-events: none;
                    }

                    .admin-toast {
                        display: flex;
                        align-items: flex-start;
                        gap: 11px;
                        padding: 14px 17px;
                        border: 1px solid rgba(190,218,182,.22);
                        border-radius: 15px;
                        background: rgba(24,37,28,.94);
                        color: #eef3e9;
                        box-shadow: 0 14px 36px rgba(0,0,0,.28);
                        backdrop-filter: blur(18px);
                        -webkit-backdrop-filter: blur(18px);
                        font: 600 13px/1.5 Quicksand,sans-serif;
                        opacity: 0;
                        transform: translateY(12px);
                        transition: opacity .25s ease, transform .25s ease;
                        pointer-events: auto;
                    }

                    .admin-toast.is-visible {
                        opacity: 1;
                        transform: translateY(0);
                    }

                    .admin-toast__dot {
                        width: 9px;
                        height: 9px;
                        flex: 0 0 9px;
                        margin-top: 5px;
                        border-radius: 50%;
                        background: #9bc39b;
                        box-shadow: 0 0 12px rgba(155,195,155,.55);
                    }

                    .admin-toast--error .admin-toast__dot {
                        background: #df8d83;
                        box-shadow: 0 0 12px rgba(223,141,131,.45);
                    }

                    .admin-toast--info .admin-toast__dot {
                        background: #d0b18a;
                        box-shadow: 0 0 12px rgba(208,177,138,.45);
                    }

                    @media(prefers-reduced-motion:reduce) {
                        .admin-toast {
                            transition: none;
                        }
                    }
                `;

                document.head.appendChild(style);

            }


            const item = document.createElement("div");

            item.className = `admin-toast admin-toast--${type}`;


            const dot = document.createElement("span");

            dot.className = "admin-toast__dot";
            dot.setAttribute("aria-hidden", "true");


            const text = document.createElement("span");

            text.textContent = message;

            item.append(dot, text);

            region.appendChild(item);


            requestAnimationFrame(() =>
                item.classList.add("is-visible")
            );


            window.setTimeout(() => {

                item.classList.remove("is-visible");

                window.setTimeout(() => item.remove(), 300);

            }, 3400);

        }


        /* =====================================================
           3. CONFIRMATION DIALOG
        ===================================================== */

        function showConfirm(title, message, actionLabel, callback) {

            if (
                !dialog ||
                !dialogForm ||
                !dialogTitle ||
                !dialogMessage ||
                !dialogConfirm
            ) {

                if (window.confirm(message)) callback();

                return;
            }


            pendingDialogAction = callback;

            dialogTitle.textContent = title;
            dialogMessage.textContent = message;

            dialogConfirm.textContent = actionLabel || "Continue";


            if (typeof dialog.showModal === "function") {

                dialog.showModal();

            } else if (window.confirm(message)) {

                const action = pendingDialogAction;

                pendingDialogAction = null;

                action?.();

            }

        }


        dialogForm?.addEventListener("submit", (event) => {

            const submittedValue = event.submitter?.value;

            if (
                submittedValue === "confirm" &&
                pendingDialogAction
            ) {

                const action = pendingDialogAction;

                pendingDialogAction = null;

                action();

            } else {

                pendingDialogAction = null;

            }

        });


        dialog?.addEventListener("cancel", () => {

            pendingDialogAction = null;

        });


        /* =====================================================
           4. ACTIVITY LOGGING
        ===================================================== */

        function addActivity(action, affectedRecord) {

            if (!activityTable) return;

            const body = $("tbody", activityTable);

            if (!body) return;


            const row = document.createElement("tr");


            [
                action,
                ADMIN_NAME,
                affectedRecord,
                currentTimestamp()
            ].forEach((value) => {

                const cell = document.createElement("td");

                cell.textContent = value;

                row.appendChild(cell);

            });


            body.prepend(row);


            if (activityEmptyState) {

                activityEmptyState.hidden = true;

            }

            filterActivity();

        }



        /* =====================================================
           5. REQUEST QUEUE
           Search, status filtering, team assignment,
           priority and status updates.
        ===================================================== */

        const requestSearch =
            document.getElementById("requestSearch");

        const requestStatusFilter =
            document.getElementById("requestStatusFilter");


        function filterRequests() {

            if (!requestTable) return;

            const query = (requestSearch?.value || "")
                .trim()
                .toLowerCase();

            const status =
                requestStatusFilter?.value || "all";


            $$("tbody tr", requestTable).forEach((row) => {

                const matchesText =
                    row.textContent.toLowerCase().includes(query);

                const matchesStatus =
                    status === "all" || row.dataset.status === status;

                row.hidden = !(matchesText && matchesStatus);

            });

        }


        requestSearch?.addEventListener(
            "input",
            filterRequests
        );

        requestStatusFilter?.addEventListener(
            "change",
            filterRequests
        );


        const statusClassMap = {

            pending: "status-pill--pending",
            assigned: "status-pill--assigned",
            "in progress": "status-pill--progress",
            verified: "status-pill--verified",
            resolved: "status-pill--verified"

        };


        function updateRequestStatus(
            row,
            newStatus,
            shouldLog = true
        ) {

            const oldStatus = row.dataset.status;

            row.dataset.status = newStatus;


            const statusCell = row.lastElementChild;

            if (statusCell) {

                let pill = $(".status-pill", statusCell);

                if (!pill) {

                    pill = document.createElement("span");

                    statusCell.replaceChildren(pill);

                }


                pill.className =
                    `status-pill ${statusClassMap[newStatus] || "status-pill--pending"}`;

                pill.textContent = newStatus.replace(
                    /\b\w/g,
                    (letter) => letter.toUpperCase()
                );

                pill.setAttribute("role", "button");

                pill.setAttribute("tabindex", "0");

                pill.setAttribute(
                    "aria-label",
                    `Change status, currently ${newStatus}`
                );

                pill.style.cursor = "pointer";

            }


            updateQueueStats();

            filterRequests();


            const requestId =
                $(".request-cell strong", row)?.textContent.trim()
                || "Request";


            if (shouldLog && oldStatus !== newStatus) {

                addActivity(
                    `Request status changed to ${newStatus}`,
                    requestId
                );

            }

        }


        /* Update dashboard statistics */

        function updateQueueStats() {

            if (!requestTable) return;

            const rows = $$("tbody tr", requestTable);


            const pending = rows.filter(
                (row) => row.dataset.status === "pending"
            ).length;


            const inProgress = rows.filter(
                (row) => row.dataset.status === "in progress"
            ).length;


            const critical = rows.filter(
                (row) => $(".priority-pill--critical", row)
            ).length;


            const values = $$(
                ".admin-stat-grid--three .admin-stat-card__value"
            );


            if (values[0]) values[0].textContent = String(pending);

            if (values[1]) values[1].textContent = String(critical);

            if (values[2]) values[2].textContent = String(inProgress);


            const queueBadge = $(
                ".admin-nav__item[data-view-target='request-queue'] .admin-nav__count"
            );


            if (queueBadge) {

                queueBadge.textContent = String(pending);

                queueBadge.setAttribute(
                    "aria-label",
                    `${pending} pending requests`
                );

                queueBadge.hidden = pending === 0;

            }

        }


        /* Assign response teams */

        requestTable?.addEventListener("change", (event) => {

            const teamSelect =
                event.target.closest(".admin-select--team");

            if (!teamSelect) return;


            const row = teamSelect.closest("tr");

            if (!row) return;


            const teamName = teamSelect.value;

            const requestId =
                $(".request-cell strong", row)?.textContent.trim()
                || "Request";


            if (teamName && teamName !== "Unassigned") {

                updateRequestStatus(row, "assigned", false);

                toast(`${teamName} assigned to ${requestId}.`);

                addActivity(
                    `Response team assigned: ${teamName}`,
                    requestId
                );

            } else {

                toast(
                    `Team removed from ${requestId}.`,
                    "info"
                );

                addActivity(
                    "Response team unassigned",
                    requestId
                );

            }

        });


        /* Make priority badges interactive */

        function makePriorityPillInteractive(pill) {

            if (pill.dataset.priorityReady === "true") return;

            pill.dataset.priorityReady = "true";

            pill.setAttribute("role", "button");

            pill.setAttribute("tabindex", "0");

            pill.setAttribute(
                "title",
                "Select to change request priority"
            );

            pill.style.cursor = "pointer";

            pill.setAttribute(
                "aria-label",
                `Change priority: ${pill.textContent.trim()}`
            );

        }


        $$(".priority-pill", requestTable || document)
            .forEach(makePriorityPillInteractive);


        /* Change request priority */

        function changePriority(pill) {

            const row = pill.closest("tr");

            if (!row) return;


            const current = pill.textContent.trim().toLowerCase();

            const choices = [
                "Critical",
                "High",
                "Medium",
                "Low"
            ];


            const answer = window.prompt(

                `Set priority for ${
                    $(".request-cell strong", row)?.textContent.trim()
                    || "this request"
                }.\nChoose: ${choices.join(", ")}`,

                choices.find(
                    (choice) => choice.toLowerCase() === current
                ) || "Medium"

            );


            if (answer === null) return;


            const chosen = choices.find(
                (choice) =>
                    choice.toLowerCase() === answer.trim().toLowerCase()
            );


            if (!chosen) {

                toast(
                    "Priority not changed. Choose Critical, High, Medium, or Low.",
                    "error"
                );

                return;

            }


            const reason = window.prompt(
                "Enter a brief reason for this priority decision:"
            );


            if (reason === null || !reason.trim()) {

                toast(
                    "A reason is required to record a priority change.",
                    "error"
                );

                return;

            }


            const className =
                `priority-pill--${chosen.toLowerCase()}`;


            pill.className = `priority-pill ${className}`;

            pill.textContent = chosen;

            pill.setAttribute(
                "aria-label",
                `Change priority: ${chosen}`
            );


            updateQueueStats();


            const requestId =
                $(".request-cell strong", row)?.textContent.trim()
                || "Request";


            addActivity(
                `Priority changed to ${chosen}: ${reason.trim()}`,
                requestId
            );

            toast(`${requestId} priority updated to ${chosen}.`);

        }


        requestTable?.addEventListener("click", (event) => {

            const pill = event.target.closest(".priority-pill");

            if (pill) changePriority(pill);

        });


        requestTable?.addEventListener("keydown", (event) => {

            const pill = event.target.closest(".priority-pill");

            if (
                pill &&
                (event.key === "Enter" || event.key === " ")
            ) {

                event.preventDefault();

                changePriority(pill);

            }

        });


        /* Change request status */

        requestTable?.addEventListener("click", (event) => {

            const pill = event.target.closest(".status-pill");

            if (!pill || !pill.closest("tr")) return;


            const row = pill.closest("tr");

            const sequence = [
                "pending",
                "assigned",
                "in progress",
                "verified"
            ];


            const current = row.dataset.status || "pending";

            const next =
                sequence[(sequence.indexOf(current) + 1) % sequence.length];


            const requestId =
                $(".request-cell strong", row)?.textContent.trim()
                || "Request";


            showConfirm(

                "Update request status?",

                `Change ${requestId} from “${current}” to “${next}”?`,

                "Update status",

                () => {

                    updateRequestStatus(row, next);

                    toast(`${requestId} status updated to ${next}.`);

                }

            );

        });


        requestTable?.addEventListener("keydown", (event) => {

            const pill = event.target.closest(
                ".status-pill[role='button']"
            );

            if (
                pill &&
                (event.key === "Enter" || event.key === " ")
            ) {

                event.preventDefault();

                pill.click();

            }

        });



        /* =====================================================
           6. RESPONSE TEAMS
           Deploy, recall and register teams.
        ===================================================== */

        const teamFormPanel =
            document.getElementById("teamFormPanel");

        const teamForm =
            document.getElementById("teamForm");

        const teamGrid = $(".admin-team-grid");


        function setTeamState(
            card,
            deployed,
            assignment = "None"
        ) {

            if (!card) return;

            card.classList.toggle(
                "admin-team-card--deployed",
                deployed
            );


            const badge = $(
                ".admin-team-card__heading .status-pill",
                card
            );


            if (badge) {

                badge.className =
                    `status-pill ${
                        deployed
                            ? "status-pill--deployed"
                            : "status-pill--available"
                    }`;

                badge.textContent =
                    deployed ? "Deployed" : "Available";

            }


            const details = $(
                ".admin-team-card__details",
                card
            );

            const assignmentLine = details?.lastElementChild;

            const assignmentValue =
                assignmentLine?.querySelector("strong");


            if (assignmentValue) {

                assignmentValue.textContent = assignment;

            }


            const button = $("[data-team-action]", card);

            if (button) {

                button.dataset.teamAction =
                    deployed ? "recall" : "deploy";

                button.textContent =
                    deployed ? "Recall team" : "Deploy team";

            }

        }


        teamGrid?.addEventListener("click", (event) => {

            const actionButton =
                event.target.closest("[data-team-action]");


            if (actionButton) {

                const card =
                    actionButton.closest(".admin-team-card");

                const teamName =
                    actionButton.dataset.team || "Response team";

                const action =
                    actionButton.dataset.teamAction;

                const deploying = action === "deploy";


                const message = deploying

                    ? `Deploy ${teamName}? The team will be marked as unavailable for other assignments.`

                    : `Recall ${teamName}? The team will be marked as available.`;


                showConfirm(

                    deploying
                        ? "Deploy response team"
                        : "Recall response team",

                    message,

                    deploying
                        ? "Deploy team"
                        : "Recall team",

                    () => {

                        setTeamState(
                            card,
                            deploying,
                            deploying ? "On standby" : "None"
                        );


                        addActivity(
                            deploying
                                ? "Response team deployed"
                                : "Response team recalled",
                            teamName
                        );


                        toast(
                            `${teamName} ${
                                deploying ? "deployed" : "recalled"
                            }.`
                        );

                    }

                );

                return;

            }


            if (event.target.closest("[data-open-team-form]")) {

                if (teamFormPanel) {

                    teamFormPanel.hidden = false;

                    teamFormPanel.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest"
                    });

                    $("input", teamFormPanel)?.focus({
                        preventScroll: true
                    });

                }

            }


            if (event.target.closest("[data-close-team-form]")) {

                if (teamFormPanel) {

                    teamFormPanel.hidden = true;

                }

                teamForm?.reset();

            }

        });


        /* Register a new response team */

        teamForm?.addEventListener("submit", (event) => {

            event.preventDefault();

            if (!teamGrid) return;


            const formData = new FormData(teamForm);


            const name = String(
                formData.get("teamName") || ""
            ).trim();

            const category = String(
                formData.get("teamCategory") || ""
            ).trim();

            const leader = String(
                formData.get("teamLeader") || ""
            ).trim();

            const members = Number(
                formData.get("teamMembers")
            );


            if (
                !name ||
                !category ||
                !leader ||
                !Number.isInteger(members) ||
                members < 1
            ) {

                toast(
                    "Please complete all team details correctly.",
                    "error"
                );

                return;

            }


            const card = document.createElement("article");

            card.className = "admin-team-card";

            card.innerHTML = `

                <div class="admin-team-card__heading">

                    <div>
                        <h2>${escapeHTML(name)}</h2>
                        <p>${escapeHTML(category)}</p>
                    </div>

                    <span class="status-pill status-pill--available">
                        Available
                    </span>

                </div>


                <div class="admin-team-card__details">

                    <p>
                        Leader:
                        <strong>${escapeHTML(leader)}</strong>
                    </p>

                    <p>
                        Members:
                        <strong>${members}</strong>
                    </p>

                    <p>
                        Assignment:
                        <strong>None</strong>
                    </p>

                </div>


                <button
                    class="admin-button admin-button--secondary admin-button--wide"
                    type="button"
                    data-team-action="deploy"
                    data-team="${escapeHTML(name)}">

                    Deploy team

                </button>

            `;


            const addCard = $(
                "[data-open-team-form]",
                teamGrid
            );


            teamGrid.insertBefore(
                card,
                addCard || null
            );


            teamForm.reset();

            if (teamFormPanel) {
                teamFormPanel.hidden = true;
            }


            addActivity(
                "New response team registered",
                name
            );

            toast(
                `${name} added to the response team registry.`
            );

        });



        /* =====================================================
           7. ANNOUNCEMENTS
           Publish new emergency announcements.
        ===================================================== */

        const announcementForm =
            document.getElementById("announcementForm");

        const announcementsList =
            $(".admin-announcements-list");


        announcementForm?.addEventListener("submit", (event) => {

            event.preventDefault();


            const formData = new FormData(announcementForm);


            const title = String(
                formData.get("title") || ""
            ).trim();

            const category = String(
                formData.get("category") || "Notice"
            ).trim();

            const message = String(
                formData.get("message") || ""
            ).trim();


            if (!title || !category || !message) {

                toast(
                    "Complete the announcement title, category, and message.",
                    "error"
                );

                return;

            }


            const card = document.createElement("article");

            card.className = "admin-announcement-card";


            const meta = document.createElement("div");

            meta.className = "admin-announcement-card__meta";


            const categoryPill = document.createElement("span");

            categoryPill.className =
                `category-pill ${
                    [
                        "Typhoon",
                        "Flood",
                        "Earthquake",
                        "Fire",
                        "Evacuation"
                    ].includes(category)
                        ? "category-pill--warning"
                        : "category-pill--notice"
                }`;

            categoryPill.textContent = category;


            const posted = document.createElement("span");

            posted.textContent = `${ADMIN_NAME} · Just now`;


            meta.append(categoryPill, posted);


            const heading = document.createElement("h3");

            heading.textContent = title;


            const paragraph = document.createElement("p");

            paragraph.textContent = message;


            card.append(meta, heading, paragraph);


            const sectionHeading = $(
                ".admin-section-heading",
                announcementsList
            );


            announcementsList?.insertBefore(
                card,
                sectionHeading?.nextSibling || null
            );


            const count = $(
                ".admin-section-heading__count",
                announcementsList
            );


            if (count) {

                const match = count.textContent.match(/\d+/);

                const nextCount =
                    (match ? Number(match[0]) : 0) + 1;

                count.textContent =
                    `${nextCount} announcements`;

            }


            announcementForm.reset();


            addActivity(
                "Emergency announcement published",
                title
            );

            toast(
                "Announcement added to the published list."
            );

        });



        /* =====================================================
           8. REPORTS
           Export request queue to CSV.
        ===================================================== */

        document
            .getElementById("exportReportsButton")
            ?.addEventListener("click", () => {

                if (!requestTable) {

                    toast(
                        "There are no request records to export.",
                        "error"
                    );

                    return;

                }


                const headings = [

                    "Request ID",
                    "Request Type",
                    "Location",
                    "Resident",
                    "Filed",
                    "Priority",
                    "Assigned Team",
                    "Status"

                ];


                const rows = $$(
                    "tbody tr",
                    requestTable
                ).map((row) => {

                    const request = $(".request-cell", row);

                    return [

                        $("strong", request)?.textContent.trim() || "",

                        $("b", request)?.textContent.trim() || "",

                        request?.querySelector("span")
                            ?.textContent.trim() || "",

                        row.children[1]?.textContent.trim() || "",

                        row.children[2]?.textContent.trim() || "",

                        $(".priority-pill", row)
                            ?.textContent.trim() || "",

                        $(".admin-select--team", row)?.value
                            || "Unassigned",

                        row.dataset.status || ""

                    ];

                });


                const csvValue = (value) =>
                    `"${String(value).replace(/"/g, '""')}"`;


                const csv = [
                    headings,
                    ...rows
                ]
                    .map((row) =>
                        row.map(csvValue).join(",")
                    )
                    .join("\r\n");


                const blob = new Blob(
                    ["\uFEFF", csv],
                    {
                        type: "text/csv;charset=utf-8;"
                    }
                );


                const url = URL.createObjectURL(blob);

                const link = document.createElement("a");

                link.href = url;

                link.download =
                    `lgu-assist-requests-${new Date().toISOString().slice(0, 10)}.csv`;


                document.body.appendChild(link);

                link.click();

                link.remove();

                URL.revokeObjectURL(url);


                addActivity(
                    "Request report exported as CSV",
                    `${rows.length} request records`
                );

                toast("CSV report downloaded.");

            });



        /* =====================================================
           9. ACCOUNTS
           Search, activate and suspend resident accounts.
        ===================================================== */

        const accountSearch =
            document.getElementById("accountSearch");


        function filterAccounts() {

            if (!accountsTable) return;


            const query = (accountSearch?.value || "")
                .trim()
                .toLowerCase();


            $$("tbody tr", accountsTable).forEach((row) => {

                row.hidden =
                    !row.textContent.toLowerCase().includes(query);

            });

        }


        accountSearch?.addEventListener(
            "input",
            filterAccounts
        );


        accountsTable?.addEventListener("click", (event) => {

            const button =
                event.target.closest("[data-account-action]");

            if (!button) return;


            const accountName =
                button.dataset.account || "Resident account";

            const action = button.dataset.accountAction;

            const activating = action === "activate";


            showConfirm(

                activating
                    ? "Activate resident account"
                    : "Suspend resident account",

                `${activating ? "Activate" : "Suspend"} the account belonging to ${accountName}?`,

                activating
                    ? "Activate account"
                    : "Suspend account",

                () => {

                    const row = button.closest("tr");

                    const statusCell = row?.children[3];

                    if (!row || !statusCell) return;


                    const status = document.createElement("span");

                    status.className =
                        `status-pill ${
                            activating
                                ? "status-pill--active"
                                : "status-pill--suspended"
                        }`;

                    status.textContent =
                        activating ? "Active" : "Suspended";


                    statusCell.replaceChildren(status);


                    button.dataset.accountAction =
                        activating ? "suspend" : "activate";

                    button.textContent =
                        activating ? "Suspend" : "Activate";


                    button.classList.toggle(
                        "admin-button--danger-outline",
                        activating
                    );

                    button.classList.toggle(
                        "admin-button--sage-outline",
                        !activating
                    );


                    addActivity(
                        `Resident account ${
                            activating ? "activated" : "suspended"
                        }`,
                        accountName
                    );


                    toast(
                        `${accountName}'s account is now ${
                            activating ? "active" : "suspended"
                        }.`
                    );

                }

            );

        });



        /* =====================================================
           10. ACTIVITY LOG
           Search activity records and display empty state.
        ===================================================== */

        const activitySearch =
            document.getElementById("activitySearch");


        function filterActivity() {

            if (!activityTable) return;


            const body = $("tbody", activityTable);

            const query = (activitySearch?.value || "")
                .trim()
                .toLowerCase();


            const rows = body ? $$("tr", body) : [];

            let visibleRows = 0;


            rows.forEach((row) => {

                const match =
                    row.textContent.toLowerCase().includes(query);

                row.hidden = !match;

                if (match) visibleRows += 1;

            });


            if (activityEmptyState) {

                activityEmptyState.hidden = visibleRows > 0;

            }

        }


        activitySearch?.addEventListener(
            "input",
            filterActivity
        );



        /* =====================================================
           11. SCROLL REVEAL FOR EACH ADMIN VIEW
        ===================================================== */

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



        /* =====================================================
           12. INITIALIZE DASHBOARD
        ===================================================== */

        updateQueueStats();

        filterRequests();

        filterAccounts();

        filterActivity();


        /* -----------------------------------------------------
           BACKEND INTEGRATION REMINDER

           The sample data and client-side actions are temporary.

           Replace these handlers with authenticated Java API calls
           and persist every change in the database and audit log.
        ----------------------------------------------------- */

    });

})();
