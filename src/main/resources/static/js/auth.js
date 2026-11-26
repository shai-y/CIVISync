
/* =========================================================
   LGU ASSIST — AUTHENTICATION INTERACTIONS
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;


    /* =====================================================
       1. LOGIN / REGISTER SWITCHING
    ===================================================== */

    const loginTab = document.getElementById("loginTab");
    const registerTab = document.getElementById("registerTab");

    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    const authTitle = document.getElementById("authTitle");
    const authSubtitle = document.getElementById("authSubtitle");

    const authMessage = document.getElementById("authMessage");

    function showForm(mode) {

        const isLogin = mode === "login";

        loginTab.classList.toggle("active", isLogin);
        registerTab.classList.toggle("active", !isLogin);

        loginForm.classList.toggle("hidden", !isLogin);
        registerForm.classList.toggle("hidden", isLogin);

        // Reset animation
        const activeForm = isLogin ? loginForm : registerForm;

        activeForm.style.animation = "none";
        void activeForm.offsetWidth;
        activeForm.style.animation = "";

        authTitle.textContent = isLogin
            ? "Citizen Account"
            : "Create Your Account";

        authSubtitle.textContent = isLogin
            ? "Access your LGU services"
            : "Join your local citizen portal";

        authMessage.classList.remove("show");
        authMessage.textContent = "";
    }

    loginTab.addEventListener("click", function () {
        showForm("login");
    });

    registerTab.addEventListener("click", function () {
        showForm("register");
    });


    /* =====================================================
       2. PASSWORD VISIBILITY
    ===================================================== */

    document.querySelectorAll(".password-toggle").forEach(
        function (button) {

            button.addEventListener("click", function () {

                const target = document.getElementById(
                    button.dataset.target
                );

                if (!target) return;

                const showing = target.type === "text";

                target.type = showing ? "password" : "text";

                button.setAttribute(
                    "aria-label",
                    showing ? "Show password" : "Hide password"
                );

            });

        }
    );


    /* =====================================================
       3. REGISTRATION PASSWORD VALIDATION
    ===================================================== */

    registerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    function showMessage(message, isError = false) {
        authMessage.textContent = message;
        authMessage.style.color = isError ? "#FFAAAA" : "#A6E6C6";
        authMessage.classList.add("show");
    }

    if (!registerForm.reportValidity()) return;

    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
        showMessage("Your passwords do not match. Please try again.", true);
        return;
    }

    const fields = new FormData(registerForm);
    const account = {
        fullName: fields.get("fullName"),
        email: fields.get("email"),
        mobileNumber: fields.get("mobileNumber"),
        barangay: fields.get("barangay"),
        password,
        confirmPassword
    };

    const button = event.submitter || registerForm.querySelector('[type="submit"]');
    if (button?.disabled) return;
    if (button) button.disabled = true;

    try {
        showMessage("Creating your account…");

        const tokenResponse = await fetch("/api/csrf", { cache: "no-store" });
        if (!tokenResponse.ok) {
            throw new Error("Could not start your session. Refresh the page and try again.");
        }

        const csrf = await tokenResponse.json();
        const response = await fetch("/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                [csrf.header]: csrf.token
            },
            body: JSON.stringify(account)
        });

        if (response.status === 201) {
            registerForm.reset();
            showMessage("Account created successfully. Click Login to sign in.");
        } else if (response.status === 409) {
            showMessage("That email or mobile number is already registered.", true);
        } else {
            const error = await response.json().catch(() => ({}));
            showMessage(
                error.message || `Registration failed (${response.status}). Please try again.`,
                true
            );
        }
    } catch (error) {
        showMessage(error.message || "Could not connect to the server.", true);
    } finally {
        if (button) button.disabled = false;
    }
});


    /* =====================================================
       4. LOGIN FORM
    ===================================================== */

	loginForm.addEventListener("submit", async function (event) {
	    event.preventDefault();

	    const submitButton = loginForm.querySelector('button[type="submit"]');
	    if (submitButton.disabled) return;

	    submitButton.disabled = true;
	    authMessage.style.color = "#A6E6C6";
	    authMessage.textContent = "Signing in...";
	    authMessage.classList.add("show");

	    try {
	        const csrfResponse = await fetch("/api/csrf", { cache: "no-store" });
	        if (!csrfResponse.ok) {
	            throw new Error("Could not start your login session. Refresh and try again.");
	        }

	        const { header, token } = await csrfResponse.json();
	        if (!header || !token) {
	            throw new Error("Could not verify your login session. Refresh and try again.");
	        }

	        const fields = new URLSearchParams({
	            identifier: loginForm.elements.namedItem("identifier").value.trim(),
	            password: loginForm.elements.namedItem("password").value
	        });

	        const response = await fetch(loginForm.action, {
	            method: "POST",
	            headers: { [header]: token },
	            body: fields
	        });

	        if (response.status === 401) {
	            throw new Error("The email, mobile number, or password is incorrect.");
	        }
	        if (response.status === 403) {
	            throw new Error("Your login request could not be verified. Refresh and try again.");
	        }
	        if (!response.ok) {
	            throw new Error(`Login failed (${response.status}). Please try again.`);
	        }

	        const page = (await response.text()).trim();
	        const destination = new URL(page, window.location.href);

	        if (destination.origin !== window.location.origin ||
	            !["/resident.html", "/admin.html"].includes(destination.pathname)) {
	            throw new Error("Login returned an unexpected page. Check account.landingPage() in Java.");
	        }

	        window.location.assign(destination.href);
	    } catch (error) {
	        authMessage.style.color = "#FFAAAA";
	        authMessage.textContent = error.message || "Could not reach the server. Please try again.";
	    } finally {
	        submitButton.disabled = false;
	    }
	});

    /* =====================================================
       5. FADE-IN ON PAGE LOAD / SCROLL
    ===================================================== */

    const revealElements = document.querySelectorAll(".reveal");

    if (reduceMotion || !("IntersectionObserver" in window)) {

        revealElements.forEach(function (element) {
            element.classList.add("visible");
        });

    } else {

        const observer = new IntersectionObserver(
            function (entries, observer) {

                entries.forEach(function (entry) {

                    if (entry.isIntersecting) {

                        entry.target.classList.add("visible");

                        observer.unobserve(entry.target);

                    }

                });

            },
            {
                threshold: 0.12
            }
        );

        revealElements.forEach(function (element) {
            observer.observe(element);
        });

    }


    /* =====================================================
       6. BACKGROUND MOUSE PARALLAX
    ===================================================== */

    const orbs = document.querySelectorAll(".auth-orb");

    if (!reduceMotion &&
        window.matchMedia("(pointer: fine)").matches) {

        document.addEventListener("pointermove", function (event) {

            if (event.pointerType === "touch") return;

            const x = (event.clientX / window.innerWidth) - 0.5;
            const y = (event.clientY / window.innerHeight) - 0.5;

            orbs.forEach(function (orb, index) {

                const depth = (index + 1) * 18;

                orb.style.transform =
                    `translate(${x * depth}px, ${y * depth}px)`;

            });

        });

    }


    /* =====================================================
       7. SCROLL PARALLAX
    ===================================================== */

    let ticking = false;

    function updateScrollParallax() {

        const scroll = window.scrollY;

        orbs.forEach(function (orb, index) {

            const speed = (index + 1) * 0.035;

            orb.style.marginTop = (scroll * speed) + "px";

        });

        ticking = false;
    }

    if (!reduceMotion) {

        window.addEventListener("scroll", function () {

            if (!ticking) {

                requestAnimationFrame(updateScrollParallax);

                ticking = true;

            }

        }, { passive: true });

    }


    /* =====================================================
       8. INITIALIZE
    ===================================================== */

    showForm("login");

});
