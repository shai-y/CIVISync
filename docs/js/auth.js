
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

    registerForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const password = document.getElementById(
            "registerPassword"
        ).value;

        const confirmPassword = document.getElementById(
            "confirmPassword"
        ).value;

        if (password !== confirmPassword) {

            authMessage.textContent =
                "Your passwords do not match. Please try again.";

            authMessage.style.color = "#FFAAAA";
            authMessage.classList.add("show");

            return;
        }

        authMessage.style.color = "#A6E6C6";

        authMessage.textContent =
            "Your information passed the initial checks. Account creation still needs backend integration.";

        authMessage.classList.add("show");

    });


    /* =====================================================
       4. LOGIN FORM
    ===================================================== */

    loginForm.addEventListener("submit", function (event) {

        event.preventDefault();

        authMessage.style.color = "#A6E6C6";

        authMessage.textContent =
            "Login form validated. Connect your Java backend to authenticate your account.";

        authMessage.classList.add("show");

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
