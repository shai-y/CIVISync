const get = id => document.getElementById(id);

const gate = get("gate");
const sessionKey = "civisync.demo.session";
const recordsKey = "civisync.demo.requests";
let records = JSON.parse(sessionStorage.getItem(recordsKey) || "[]");

function render() {
    const sections = [...document.querySelectorAll("main section")];
    const selected =
        sections.find(section => "#" + section.id === location.hash) ||
        sections[0];

    for (const section of sections) {
        section.hidden = section !== selected;
    }

    for (const link of document.querySelectorAll("nav a")) {
        if (link.hash === "#" + selected.id) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    }

    get("count").textContent = records.length;

    const list = get("records");
    list.replaceChildren();

    if (!records.length) {
        list.textContent = "No requests yet.";
    }

    for (const record of records) {
        const card = document.createElement("article");

        const fields = [
            ["small", record.id + " · Pending review"],
            ["h2", record.category],
            ["strong", record.location],
            ["p", record.details]
        ];

        for (const [tag, value] of fields) {
            const node = document.createElement(tag);
            node.textContent = value;
            card.append(node);
        }

        list.append(card);
    }
}

get("entry").addEventListener("submit", event => {
    event.preventDefault();

    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));

    for (const key of ["location", "details"]) {
        if (!values[key].trim()) {
            form.elements[key].focus();
            form.elements[key].value = "";
            form.reportValidity();
            return;
        }
    }

    records.unshift({
        ...values,
        id: "DEMO-" + String(records.length + 1).padStart(4, "0")
    });

    sessionStorage.setItem(recordsKey, JSON.stringify(records));
    form.reset();

    get("feedback").textContent = "Demo request saved in this tab.";
    location.hash = "history";
    render();
});

get("enter").onclick = () => {
    sessionStorage.setItem(sessionKey, "active");
    gate.close();
};

get("exit").onclick = () => {
    sessionStorage.removeItem(sessionKey);
    sessionStorage.removeItem(recordsKey);
    location.replace("index.html");
};

gate.addEventListener("cancel", event => event.preventDefault());
window.addEventListener("hashchange", render);

render();

if (!sessionStorage.getItem(sessionKey)) {
    gate.showModal();
}