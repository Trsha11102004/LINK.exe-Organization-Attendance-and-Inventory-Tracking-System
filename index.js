document.addEventListener("DOMContentLoaded", () => {
    
    // 1. FOOTER BACKGROUND SCROLL EFFECT
    document.addEventListener("scroll", function () {
        const footer = document.querySelector("footer");
        if (footer) {
            const rect = footer.getBoundingClientRect();
            if (rect.top < window.innerHeight) {
                footer.style.background = "rgba(255, 255, 255, 0.85)"; // solid
            } else {
                footer.style.background = "rgba(255, 255, 255, 0.2)"; // transparent
            }
        }
    });

    // 2. BACK TO TOP BUTTON
    const backToTop = document.getElementById("backToTop");
    if (backToTop) {
        window.addEventListener("scroll", () => {
            const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrolled = window.scrollY;
            if (scrolled > scrollableHeight * 0.6) {
                backToTop.style.display = "flex";
            } else {
                backToTop.style.display = "none";
            }
        });

        backToTop.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    // 3. HERO SLIDER
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    let currentIndex = 0;
    const slideInterval = 5000;

    if (slides.length > 0) {
        function nextSlide() {
            slides[currentIndex].classList.remove('active');
            dots[currentIndex].classList.remove('active');
            
            currentIndex = (currentIndex + 1) % slides.length;
            
            slides[currentIndex].classList.add('active');
            dots[currentIndex].classList.add('active');
        }
        setInterval(nextSlide, slideInterval);
    }

    // 4. PILLAR HOVER EFFECTS (Link to Card)
    const texts = document.querySelectorAll('.pillar-link');
    texts.forEach(text => {
        const targetId = text.getAttribute('data-target');
        const targetCard = document.getElementById(targetId);

        if (targetCard) {
            text.addEventListener('mouseenter', () => {
                targetCard.classList.add('active');
                text.classList.add('active');
            });

            text.addEventListener('mouseleave', () => {
                targetCard.classList.remove('active');
                text.classList.remove('active');
            });
        }
    });

    // 5. SCROLL TO FOOTER (Optional ID check)
    const aboutUsBtn = document.getElementById("aboutUsBtn");
    if (aboutUsBtn) {
        aboutUsBtn.addEventListener("click", () => {
            document.querySelector("footer").scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    }
});