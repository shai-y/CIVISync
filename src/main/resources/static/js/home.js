async function checkConnection() {

    const backendStatus =
        document.getElementById("backendStatus");

    const backendMessage =
        document.getElementById("backendMessage");

    try {

        const response = await fetch("/api/status");

        if (!response.ok) {
            throw new Error("Backend request failed");
        }

        const data = await response.json();

        backendStatus.textContent =
            "Status: " + data.status;

        backendMessage.textContent =
            data.message;

    } catch (error) {

        backendStatus.textContent = "Offline";

        backendMessage.textContent =
            "Unable to connect to the Java backend.";

        console.error(error);
    }
}



/* =========================================================
   LGU ASSIST — 3D PARALLAX MOUSE INTERACTION
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const visual = document.getElementById("heroVisual");

    const emblem = document.getElementById("heroEmblem");

    // Stop if the emblem does not exist on this page.
    if (!visual || !emblem) {
        return;
    }

    // Respect accessibility settings.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    visual.addEventListener("pointermove", function (event) {

        // No mouse-style movement on touchscreens.
        if (event.pointerType === "touch") {
            return;
        }

        const rect = visual.getBoundingClientRect();

        // Calculate the mouse position relative to the emblem.
        const x = ((event.clientX - rect.left) / rect.width) - 0.5;

        const y = ((event.clientY - rect.top) / rect.height) - 0.5;

        // Convert mouse movement into 3D rotation.
        const rotateX = -y * 16;

        const rotateY = x * 20;

        emblem.style.setProperty(
            "--tilt-x",
            rotateX + "deg"
        );

        emblem.style.setProperty(
            "--tilt-y",
            rotateY + "deg"
        );


        // Give the floating particles their own movement.

        visual.style.setProperty(
            "--dot-one-x",
            (x * -18) + "px"
        );

        visual.style.setProperty(
            "--dot-one-y",
            (y * -14) + "px"
        );

        visual.style.setProperty(
            "--dot-two-x",
            (x * 22) + "px"
        );

        visual.style.setProperty(
            "--dot-two-y",
            (y * 18) + "px"
        );

        visual.style.setProperty(
            "--dot-three-x",
            (x * -12) + "px"
        );

        visual.style.setProperty(
            "--dot-three-y",
            (y * 20) + "px"
        );

    });
	
	
	/* =========================================================
	   LGU ASSIST — CURSOR GLOW + SCROLL REVEAL
	========================================================= */

	document.addEventListener("DOMContentLoaded", function () {

	    const reduceMotion = window.matchMedia(
	        "(prefers-reduced-motion: reduce)"
	    ).matches;


	    /* =====================================================
	       1. CURSOR FOLLOWING GLOW
	    ===================================================== */

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
	        .contact-form-panel input,
	        .contact-form-panel textarea,
	        .outline-button,
	        .system-test-section button,
	        .footer-links a
	    `);

	    // Only activate cursor tracking on devices with a mouse
	    if (window.matchMedia("(pointer: fine)").matches) {

	        glowElements.forEach(function (element) {

	            element.classList.add("cursor-glow");

	            element.addEventListener("pointermove", function (event) {

	                if (event.pointerType === "touch") {
	                    return;
	                }

	                const rect = element.getBoundingClientRect();

	                const x = (
	                    (event.clientX - rect.left) / rect.width
	                ) * 100;

	                const y = (
	                    (event.clientY - rect.top) / rect.height
	                ) * 100;

	                element.style.setProperty("--glow-x", x + "%");
	                element.style.setProperty("--glow-y", y + "%");

	            });

	        });

	    }


	    /* =====================================================
	       2. SCROLL REVEAL ANIMATION
	    ===================================================== */

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

	    revealElements.forEach(function (element) {
	        element.classList.add("reveal-on-scroll");
	    });

	    document.body.classList.add("reveal-enabled");

	    // Do not animate if the user prefers reduced motion
	    if (reduceMotion) {

	        revealElements.forEach(function (element) {
	            element.classList.add("is-visible");
	        });

	        return;
	    }

	    // Fallback for browsers without IntersectionObserver
	    if (!("IntersectionObserver" in window)) {

	        revealElements.forEach(function (element) {
	            element.classList.add("is-visible");
	        });

	        return;
	    }

	    const revealObserver = new IntersectionObserver(
	        function (entries, observer) {

	            entries.forEach(function (entry) {

	                if (entry.isIntersecting) {

	                    entry.target.classList.add("is-visible");

	                    // Reveal only once
	                    observer.unobserve(entry.target);
	                }

	            });

	        },
	        {
	            threshold: 0.12,
	            rootMargin: "0px 0px -40px 0px"
	        }
	    );

	    revealElements.forEach(function (element) {
	        revealObserver.observe(element);
	    });

	});

	


    // Return the emblem to its original position.

    visual.addEventListener("pointerleave", function () {

        emblem.style.setProperty("--tilt-x", "0deg");

        emblem.style.setProperty("--tilt-y", "0deg");

        visual.style.setProperty("--dot-one-x", "0px");
        visual.style.setProperty("--dot-one-y", "0px");

        visual.style.setProperty("--dot-two-x", "0px");
        visual.style.setProperty("--dot-two-y", "0px");

        visual.style.setProperty("--dot-three-x", "0px");
        visual.style.setProperty("--dot-three-y", "0px");

    });

});


/* =========================================================
   LGU ASSIST — SCROLL REVEAL
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const elements = document.querySelectorAll(`
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

    // Accessibility: show everything without animation
    if (
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches
    ) {
        return;
    }

    // Fallback for unsupported browsers
    if (!("IntersectionObserver" in window)) {
        return;
    }

    // Observe elements as they enter the screen
    const observer = new IntersectionObserver(
        function (entries, observer) {

            entries.forEach(function (entry) {

                if (entry.isIntersecting) {

                    entry.target.classList.add(
                        "reveal-on-scroll",
                        "is-visible"
                    );

                    // Animate only once
                    observer.unobserve(entry.target);
                }

            });

        },
        {
            threshold: 0.12,
            rootMargin: "0px 0px -40px 0px"
        }
    );

    elements.forEach(function (element) {

        element.classList.add("reveal-on-scroll");

        observer.observe(element);

    });

});


/* =========================================================
   LGU ASSIST — 3D SCROLL PARALLAX
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const visual = document.getElementById("heroVisual");

    if (!visual) {
        return;
    }

    // Respect reduced-motion accessibility settings
    if (
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches
    ) {
        return;
    }

    let animationFrame = null;

    function updateScrollParallax() {

        const rect = visual.getBoundingClientRect();

        // Find the center of the 3D object
        const visualCenter = rect.top + rect.height / 2;

        const viewportCenter = window.innerHeight / 2;

        // Calculate scroll progress relative to the viewport
        const maxDistance =
            (window.innerHeight + rect.height) / 2;

        const progress = Math.max(
            -1,
            Math.min(
                1,
                (viewportCenter - visualCenter) / maxDistance
            )
        );

        // Move each glass layer at a different speed
        visual.style.setProperty(
            "--scroll-back-y",
            (-progress * 46) + "px"
        );

        visual.style.setProperty(
            "--scroll-middle-y",
            (-progress * 30) + "px"
        );

        visual.style.setProperty(
            "--scroll-front-y",
            (-progress * 16) + "px"
        );

        visual.style.setProperty(
            "--scroll-ring-y",
            (-progress * 8) + "px"
        );

        animationFrame = null;
    }

    // Optimize scroll updates with requestAnimationFrame
    function requestParallaxUpdate() {

        if (animationFrame !== null) {
            return;
        }

        animationFrame = requestAnimationFrame(
            updateScrollParallax
        );
    }

    window.addEventListener(
        "scroll",
        requestParallaxUpdate,
        { passive: true }
    );

    window.addEventListener(
        "resize",
        requestParallaxUpdate
    );

    // Initial positioning
    updateScrollParallax();

});



// Check connection when the page loads
checkConnection();