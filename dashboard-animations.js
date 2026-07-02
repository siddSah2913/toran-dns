/* ═══════════════════════════════════════════════════════════════
   TORAN DNS — Dashboard Animations
   GSAP entrance animations for dashboard sections
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  if (isReducedMotion) return;

  gsap.registerPlugin(ScrollTrigger);

  function init() {
    // Sidebar entrance
    gsap.set('.sidebar', { opacity: 0, x: -20 });
    gsap.set('.sidebar .nav-item', { opacity: 0, x: -10 });

    // Topbar
    gsap.set('.topbar', { opacity: 0, y: -10 });

    // Stat cards
    gsap.set('.stat-card', { opacity: 0, y: 25, scale: 0.97 });

    // Chart cards
    gsap.set('.card', { opacity: 0, y: 20 });

    // Endpoint section
    gsap.set('.endpoint-section', { opacity: 0, y: 20 });

    // Table rows
    gsap.set('.query-table tbody tr', { opacity: 0, x: -8 });

    // Toggle rows
    gsap.set('.toggle-row', { opacity: 0, x: -10 });

    // Device rows
    gsap.set('.device-row', { opacity: 0, x: -8 });

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // Sidebar
    tl.to('.sidebar', { opacity: 1, x: 0, duration: 0.7 }, 0)
      .to('.sidebar .nav-item', { opacity: 1, x: 0, duration: 0.4, stagger: 0.03 }, 0.2);

    // Topbar
    tl.to('.topbar', { opacity: 1, y: 0, duration: 0.6 }, 0.15);

    // Stat cards with stagger
    tl.to('.stat-card', {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.6,
      stagger: 0.08,
      ease: 'back.out(1.2)'
    }, 0.3);

    // Cards with stagger
    tl.to('.card', {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.1
    }, 0.5);

    // Endpoint section
    tl.to('.endpoint-section', { opacity: 1, y: 0, duration: 0.6 }, 0.6);

    // Table rows
    tl.to('.query-table tbody tr', {
      opacity: 1,
      x: 0,
      duration: 0.4,
      stagger: 0.04
    }, 0.7);

    // Toggle rows
    tl.to('.toggle-row', {
      opacity: 1,
      x: 0,
      duration: 0.4,
      stagger: 0.05
    }, 0.75);

    // Device rows
    tl.to('.device-row', {
      opacity: 1,
      x: 0,
      duration: 0.4,
      stagger: 0.05
    }, 0.8);

    // Stat card hover micro-interaction
    document.querySelectorAll('.stat-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        gsap.to(card, { y: -3, duration: 0.25, ease: 'power2.out' });
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(card, { y: 0, duration: 0.35, ease: 'power3.out' });
      });
    });

    // Card hover micro-interaction
    document.querySelectorAll('.card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        gsap.to(card, { y: -2, duration: 0.25, ease: 'power2.out' });
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(card, { y: 0, duration: 0.35, ease: 'power3.out' });
      });
    });

    // Button hover micro-interaction
    document.querySelectorAll('.btn, .btn-add, .copy-btn, .icon-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        gsap.to(btn, { scale: 1.02, duration: 0.2, ease: 'power2.out' });
      });
      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, { scale: 1, duration: 0.25, ease: 'power3.out' });
      });
    });

    // Nav item hover
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        gsap.to(item, { x: 3, duration: 0.2, ease: 'power2.out' });
      });
      item.addEventListener('mouseleave', () => {
        gsap.to(item, { x: 0, duration: 0.25, ease: 'power3.out' });
      });
    });

    // Blob parallax on scroll (subtle)
    if (!isMobile) {
      // ponytail: scrub 2/3 → 1/1.2 — same catch-up-lag issue as index.html's blobs
      gsap.to('.blob-1', { y: -50, ease: 'none', scrollTrigger: { trigger: '.main', start: 'top top', end: 'bottom bottom', scrub: 1 } });
      gsap.to('.blob-2', { y: -80, ease: 'none', scrollTrigger: { trigger: '.main', start: 'top top', end: 'bottom bottom', scrub: 1.2 } });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
