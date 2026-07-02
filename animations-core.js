/* ═══════════════════════════════════════════════════════════════
   TORAN DNS — Unified Animation System
   GSAP + ScrollTrigger
   Performance: only animate transform, opacity, clip-path
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── FEATURE DETECTION ──
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const isTablet = window.matchMedia('(max-width: 1024px)') && !isMobile;
  const isDesktop = !isMobile && !isTablet;

  if (isReducedMotion) return;

  // Register GSAP plugins
  if (typeof gsap !== 'undefined') {
    if (typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }
  }

  // ── BACKGROUND ANIMATIONS ──
  // Always alive, GPU-friendly
  function initBackgroundAnimations() {
    if (typeof gsap === 'undefined') return;

    // Subtle blob parallax on mouse move (desktop only)
    if (isDesktop) {
      let mouseX = window.innerWidth / 2;
      let mouseY = window.innerHeight / 2;
      let currentX = mouseX;
      let currentY = mouseY;
      let parallaxActive = true;

      const onMouseMove = (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
      };

      document.addEventListener('mousemove', onMouseMove);

      const updateMouseParallax = function() {
        if (!parallaxActive) return;
        const deltaX = (mouseX - currentX) * 0.03;
        const deltaY = (mouseY - currentY) * 0.3;

        currentX += deltaX;
        currentY += deltaY;

        const blob1 = document.querySelector('.bg-blob-1');
        const blob2 = document.querySelector('.bg-blob-2');
        const blob3 = document.querySelector('.bg-blob-3');

        if (blob1) gsap.set(blob1, { x: deltaX * 2, y: deltaY * 2 });
        if (blob2) gsap.set(blob2, { x: deltaX * -1.5, y: deltaY * -1.5 });
        if (blob3) gsap.set(blob3, { x: deltaX, y: deltaY });

        requestAnimationFrame(updateMouseParallax);
      };

      updateMouseParallax();

      window.addEventListener('beforeunload', () => {
        parallaxActive = false;
        document.removeEventListener('mousemove', onMouseMove);
      });
    }
  }

  // ── LOGO HOVER ANIMATION ──
  function initLogoAnimations() {
    document.querySelectorAll('.logo').forEach(logo => {
      const mark = logo.querySelector('.logo-mark');
      if (!mark) return;

      logo.addEventListener('mouseenter', () => {
        gsap.to(mark, {
          scale: 1.05,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      });

      logo.addEventListener('mouseleave', () => {
        gsap.to(mark, {
          scale: 1,
          duration: 0.4,
          ease: 'power3.out',
          overwrite: 'auto'
        });
      });
    });
  }

  // ── BUTTON MICRO-INTERACTIONS ──
  function initButtonAnimations() {
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        gsap.to(btn, {
          scale: 1.02,
          y: -1,
          duration: 0.2,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      });

      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, {
          scale: 1,
          y: 0,
          duration: 0.3,
          ease: 'power3.out',
          overwrite: 'auto'
        });
      });

      btn.addEventListener('mousedown', () => {
        gsap.to(btn, { scale: 0.98, duration: 0.1 });
      });

      btn.addEventListener('mouseup', () => {
        gsap.to(btn, { scale: 1.02, duration: 0.15, ease: 'back.out(2)' });
      });
    });
  }

  // ── CARD HOVER ANIMATIONS ──
  function initCardAnimations() {
    document.querySelectorAll('.card, .feature-card, .pricing-card').forEach(card => {
      // 3D tilt on desktop
      if (isDesktop) {
        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;

          const rotateX = ((y - centerY) / centerY) * -5;
          const rotateY = ((x - centerX) / centerX) * 5;

          gsap.to(card, {
            rotateX: rotateX,
            rotateY: rotateY,
            transformPerspective: 1000,
            duration: 0.4,
            ease: 'power2.out',
            overwrite: 'auto'
          });
        });

        card.addEventListener('mouseleave', () => {
          gsap.to(card, {
            rotateX: 0,
            rotateY: 0,
            y: 0,
            duration: 0.5,
            ease: 'power3.out',
            overwrite: 'auto'
          });
        });
      }

      // Lift on hover
      card.addEventListener('mouseenter', () => {
        if (!isDesktop) {
          gsap.to(card, {
            y: -3,
            duration: 0.25,
            ease: 'power2.out',
            overwrite: 'auto'
          });
        }
      });

      card.addEventListener('mouseleave', () => {
        if (!isDesktop) {
          gsap.to(card, {
            y: 0,
            duration: 0.35,
            ease: 'power3.out',
            overwrite: 'auto'
          });
        }
      });
    });
  }

  // ── NAV ITEM ANIMATIONS ──
  function initNavAnimations() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        gsap.to(item, {
          x: 3,
          duration: 0.2,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      });

      item.addEventListener('mouseleave', () => {
        gsap.to(item, {
          x: 0,
          duration: 0.25,
          ease: 'power3.out',
          overwrite: 'auto'
        });
      });
    });
  }

  // ── SCROLL REVEAL (batch) ──
  function initScrollReveal() {
    if (typeof ScrollTrigger === 'undefined') return;

    // Batch reveal for cards
    ScrollTrigger.batch('.feature-card, .pricing-card', {
      onEnter: (elements) => {
        gsap.fromTo(elements,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.08,
            ease: 'power3.out',
            overwrite: 'auto'
          }
        );
      },
      start: 'top 85%',
      once: true
    });

    // Batch reveal for generic elements
    ScrollTrigger.batch('.reveal, [data-reveal]', {
      onEnter: (elements) => {
        gsap.fromTo(elements,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.06,
            ease: 'power3.out',
            overwrite: 'auto'
          }
        );
      },
      start: 'top 85%',
      once: true
    });
  }

  // ── ENTRANCE ANIMATION (page load) ──
  function initEntranceAnimations() {
    // Staggered reveal for page content
    const entranceElements = document.querySelectorAll('[data-entrance]');
    if (entranceElements.length === 0) return;

    gsap.fromTo(entranceElements,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power3.out',
        delay: 0.2
      }
    );
  }

  // ── STAT COUNTER ANIMATION ──
  function initCounterAnimations() {
    if (typeof ScrollTrigger === 'undefined') return;

    document.querySelectorAll('[data-count]').forEach(el => {
      const target = parseInt(el.getAttribute('data-count'));
      if (isNaN(target)) return;

      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.from({ val: 0 }, {
            val: target,
            duration: 1.5,
            ease: 'power2.out',
            onUpdate: function () {
              el.textContent = Math.round(this.targets()[0].val);
            }
          });
        }
      });
    });
  }

  // ── DNS PACKET ANIMATION ──
  function initDNSPacketAnimation() {
    // These are handled by CSS animations for performance
    // GSAP only needed for complex interactions
  }

  // ── FLOATING ELEMENTS ──
  function initFloatingElements() {
    if (isMobile) return;

    document.querySelectorAll('[data-float]').forEach(el => {
      const speed = parseFloat(el.getAttribute('data-float')) || 4;
      gsap.to(el, {
        y: -12,
        duration: speed,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1
      });
    });
  }

  // ── INITIALIZE ALL ──
  function init() {
    initBackgroundAnimations();
    initLogoAnimations();
    initButtonAnimations();
    initCardAnimations();
    initNavAnimations();
    initScrollReveal();
    initEntranceAnimations();
    initCounterAnimations();
    initDNSPacketAnimation();
    initFloatingElements();

    // Refresh ScrollTrigger after everything is set up
    if (typeof ScrollTrigger !== 'undefined') {
      setTimeout(() => ScrollTrigger.refresh(), 100);
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
