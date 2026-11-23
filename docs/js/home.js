/* =========================================================
   CIVISync — HOME PAGE SCRIPTS
   1. Backend connection check
   2. Emblem mouse tilt + particle parallax
   3. Emblem scroll parallax
   4. Cursor glow
   5. Scroll reveal
   6. Contact form (placeholder until backend is connected)
========================================================= */

"use strict";

const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
).matches;


/* =========================================================
   1. BACKEND CONNECTION CHECK
   Global so the inline onclick in index.html can call it.
========================================================= */

async function checkConnection() {

    const statusEl = document.getElementById("backendStatus");
    const messageEl = document.getElementById("backendMessage");

    // Section is removable for production.
    if (!statusEl || !messageEl) {
        return;
    }

    statusEl.textContent = "Checking...";

    try {

        const response = await fetch("/api/status");

        if (!response.ok) {
            throw new Error("Backend request failed: " + response.status);
        }

        const data = await response.json();

        statusEl.textContent = "Status: " + data.status;
        messageEl.textContent = data.message;

    } catch (error) {

        statusEl.textContent = "Offline";
        messageEl.textContent = "Unable to connect to the Java backend.";

        console.error(error);
    }
}


/* =========================================================
   2. EMBLEM — MOUSE TILT + PARTICLE PARALLAX
========================================================= */

function initEmblemTilt() {

    const visual = document.getElementById("heroVisual");
    const emblem = document.getElementById("heroEmblem");

    if (!visual || !emblem || prefersReducedMotion) {
        return;
    }

    // Each particle: [CSS variable prefix, x factor, y factor]
    const particles = [
        ["--dot-one", -18, -14],
        ["--dot-two", 22, 18],
        ["--dot-three", -12, 20]
    ];

    visual.addEventListener("pointermove", function (event) {

        // No mouse-style movement on touchscreens.
        if (event.pointerType === "touch") {
            return;
        }

        const rect = visual.getBoundingClientRect();

        // Pointer position from -0.5 to 0.5 across the visual.
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;

        emblem.style.setProperty("--tilt-x", (-y * 16) + "deg");
        emblem.style.setProperty("--tilt-y", (x * 20) + "deg");

        particles.forEach(function (particle) {
            visual.style.setProperty(particle[0] + "-x", (x * particle[1]) + "px");
            visual.style.setProperty(particle[0] + "-y", (y * particle[2]) + "px");
        });
    });

    // Return everything to its resting position.
    visual.addEventListener("pointerleave", function () {

        emblem.style.setProperty("--tilt-x", "0deg");
        emblem.style.setProperty("--tilt-y", "0deg");

        particles.forEach(function (particle) {
            visual.style.setProperty(particle[0] + "-x", "0px");
            visual.style.setProperty(particle[0] + "-y", "0px");
        });
    });
}


/* =========================================================
   3. EMBLEM — SCROLL PARALLAX
========================================================= */

function initScrollParallax() {

    const visual = document.getElementById("heroVisual");

    if (!visual || prefersReducedMotion) {
        return;
    }

    // Each glass layer moves at its own speed.
    const layers = [
        ["--scroll-back-y", 46],
        ["--scroll-middle-y", 30],
        ["--scroll-front-y", 16],
        ["--scroll-ring-y", 8]
    ];

    let frame = null;

    function update() {

        const rect = visual.getBoundingClientRect();

        const visualCenter = rect.top + rect.height / 2;
        const viewportCenter = window.innerHeight / 2;
        const maxDistance = (window.innerHeight + rect.height) / 2;

        // -1 (below center) to 1 (above center)
        const progress = Math.max(
            -1,
            Math.min(1, (viewportCenter - visualCenter) / maxDistance)
        );

        layers.forEach(function (layer) {
            visual.style.setProperty(layer[0], (-progress * layer[1]) + "px");
        });

        frame = null;
    }

    function requestUpdate() {
        if (frame === null) {
            frame = requestAnimationFrame(update);
        }
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    update();
}


/* =========================================================
   4. CURSOR GLOW
========================================================= */

function initCursorGlow() {

    // Only on devices with a precise pointer (mouse / trackpad).
    if (!window.matchMedia("(pointer: fine)").matches) {
        return;
    }

    // Pseudo-elements don't render on <input>/<textarea>,
    // so form fields use their own focus style instead.
    const glowElements = document.querySelectorAll(`
        .header-container,
        .brand-icon,
        .main-navigation a,
        .nav-button,
        .hero-badge,
        .primary-button,
        .secondary-button,
        .highlight-item,
        .step-card,
        .step-icon,
        .advisory-panel,
        .advisory-card,
        .evacuation-panel,
        .information-item,
        .information-icon,
        .about-highlights > div,
        .contact-card,
        .contact-icon,
        .contact-form-panel,
        .outline-button,
        .system-test-section button,
        .footer-links a
    `);

    glowElements.forEach(function (element) {

        element.classList.add("cursor-glow");

        element.addEventListener("pointermove", function (event) {

            if (event.pointerType === "touch") {
                return;
            }

            const rect = element.getBoundingClientRect();

            element.style.setProperty(
                "--glow-x",
                ((event.clientX - rect.left) / rect.width) * 100 + "%"
            );

            element.style.setProperty(
                "--glow-y",
                ((event.clientY - rect.top) / rect.height) * 100 + "%"
            );
        });
    });
}


/* =========================================================
   5. SCROLL REVEAL
========================================================= */

function initScrollReveal() {

    // Reduced motion or no IntersectionObserver:
    // leave everything visible, add nothing.
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
        return;
    }

    const revealElements = document.querySelectorAll(`
        .hero-content,
        .hero-visual,
        .section-heading,
        .emergency-heading,
        .step-card,
        .advisory-panel,
        .advisory-card,
        .evacuation-panel,
        .information-item,
        .about-content,
        .about-highlights > div,
        .contact-card,
        .contact-form-panel,
        .system-test-section .section-container,
        .footer-content,
        .footer-bottom
    `);

    const observer = new IntersectionObserver(
        function (entries) {

            entries.forEach(function (entry) {

                if (!entry.isIntersecting) {
                    return;
                }

                const element = entry.target;

                element.classList.add("is-visible");
                observer.unobserve(element);

                // Once revealed, drop the reveal classes so the
                // stagger delay and transform don't linger and
                // make hover effects feel sluggish.
                element.addEventListener("transitionend", function cleanup(event) {

                    if (event.target !== element || event.propertyName !== "opacity") {
                        return;
                    }

                    element.classList.remove("reveal-on-scroll", "is-visible");
                    element.removeEventListener("transitionend", cleanup);
                });
            });
        },
        {
            threshold: 0.12,
            rootMargin: "0px 0px -40px 0px"
        }
    );

    revealElements.forEach(function (element) {
        element.classList.add("reveal-on-scroll");
        observer.observe(element);
    });
}


/* =========================================================
   6. CONTACT FORM (PLACEHOLDER)
   Prevents a page reload until the backend endpoint exists.
========================================================= */

function initContactForm() {

    const form = document.getElementById("contactForm");
    const status = document.getElementById("contactStatus");

    if (!form) {
        return;
    }

    form.addEventListener("submit", function (event) {

        event.preventDefault();

        if (status) {
            status.textContent =
                "Inquiries can't be sent yet. This form will be connected to the backend soon.";
        }
    });
}


/* =========================================================
   INIT
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    initEmblemTilt();
    initScrollParallax();
    initCursorGlow();
    initScrollReveal();
    initContactForm();

    checkConnection();
});
