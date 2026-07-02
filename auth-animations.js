/* ═══════════════════════════════════════════════════════════════
   TORAN DNS — Auth Page Animations (Landscape Layout)
   GSAP entrance + mouse interaction + continuous motion
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth <= 768;
  const isTablet = window.innerWidth <= 1024 && window.innerWidth > 768;
  const isDesktop = window.innerWidth > 1024;

  if (isReducedMotion) return;

  function init() {
    const container = document.querySelector('.login-container, .signup-container');
    const brandingPanel = document.querySelector('.branding-panel');
    if (!container) return;

    // ── BRANDING PANEL ENTRANCE ──
    if (brandingPanel && isDesktop) {
      gsap.set('.brand-logo', { opacity: 0, y: 30 });
      gsap.set('.brand-headline', { opacity: 0, y: 40 });
      gsap.set('.brand-subtitle', { opacity: 0, y: 30 });
      gsap.set('.brand-features', { opacity: 0, y: 30 });
      gsap.set('.dashboard-preview', { opacity: 0, y: 80, rotateY: isTablet ? 15 : -15, rotateX: 5 });

      const brandTl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.2 });

      brandTl
        .to('.brand-logo', { opacity: 1, y: 0, duration: 0.8 }, 0)
        .to('.brand-headline', { opacity: 1, y: 0, duration: 0.9 }, 0.15)
        .to('.brand-subtitle', { opacity: 1, y: 0, duration: 0.7 }, 0.3)
        .to('.brand-features', { opacity: 1, y: 0, duration: 0.7 }, 0.45)
        .to('.dashboard-preview', { 
          opacity: 1, 
          y: 0, 
          rotateY: isTablet ? 10 : -10, 
          rotateX: 3, 
          duration: 1.2, 
          ease: 'power2.out' 
        }, 0.5);

      // Feature items stagger
      gsap.set('.brand-feature', { opacity: 0, x: -20 });
      gsap.to('.brand-feature', {
        opacity: 1,
        x: 0,
        duration: 0.6,
        stagger: 0.12,
        delay: 0.6,
        ease: 'power3.out'
      });
    }

    // ── AUTH CARD ENTRANCE ──
    gsap.set(container, { opacity: 0, y: 40, scale: 0.96 });
    gsap.set('.logo-mark', { opacity: 0, scale: 0.5, rotation: -15 });
    gsap.set('.logo-text', { opacity: 0, y: 10 });
    gsap.set('.header-title', { opacity: 0, y: 15 });
    gsap.set('.header-subtitle', { opacity: 0, y: 10 });
    gsap.set('.btn-social', { opacity: 0, y: 15 });
    gsap.set('.divider', { opacity: 0, scaleX: 0 });
    gsap.set('.form-group', { opacity: 0, y: 15 });
    gsap.set('.form-actions', { opacity: 0, y: 10 });
    gsap.set('.btn-submit', { opacity: 0, y: 15, scale: 0.95 });
    gsap.set('.footer-note', { opacity: 0, y: 10 });

    const cardTl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: isDesktop ? 0.4 : 0.1 });

    cardTl
      .to(container, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power4.out' }, 0)
      .to('.logo-mark', { opacity: 1, scale: 1, rotation: 0, duration: 0.7, ease: 'back.out(2)' }, 0.15)
      .to('.logo-text', { opacity: 1, y: 0, duration: 0.5 }, 0.25)
      .to('.header-title', { opacity: 1, y: 0, duration: 0.6 }, 0.3)
      .to('.header-subtitle', { opacity: 1, y: 0, duration: 0.5 }, 0.4)
      .to('.btn-social', { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }, 0.5)
      .to('.divider', { opacity: 1, scaleX: 1, duration: 0.5, ease: 'power2.out' }, 0.6)
      .to('.form-group', { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }, 0.65)
      .to('.form-actions', { opacity: 1, y: 0, duration: 0.4 }, 0.85)
      .to('.btn-submit', { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.5)' }, 0.9)
      .to('.footer-note', { opacity: 1, y: 0, duration: 0.4 }, 1.0);

    // ── BUTTON MICRO-INTERACTIONS ──
    const submitBtn = container.querySelector('.btn-submit');
    if (submitBtn) {
      submitBtn.addEventListener('mouseenter', () => {
        gsap.to(submitBtn, { scale: 1.02, duration: 0.25, ease: 'power2.out' });
      });
      submitBtn.addEventListener('mouseleave', () => {
        gsap.to(submitBtn, { scale: 1, duration: 0.35, ease: 'power3.out' });
      });
      submitBtn.addEventListener('mousedown', () => {
        gsap.to(submitBtn, { scale: 0.98, duration: 0.1 });
      });
      submitBtn.addEventListener('mouseup', () => {
        gsap.to(submitBtn, { scale: 1.02, duration: 0.15, ease: 'back.out(2)' });
      });
    }

    // Social button hover
    container.querySelectorAll('.btn-social').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        gsap.to(btn, { y: -2, scale: 1.01, duration: 0.25, ease: 'power2.out' });
      });
      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, { y: 0, scale: 1, duration: 0.35, ease: 'power3.out' });
      });
    });

    // ── 3D DASHBOARD PREVIEW MOUSE INTERACTION ──
    if (isDesktop) {
      const preview = document.querySelector('.dashboard-preview');
      const previewInner = document.querySelector('.dashboard-preview-inner');
      if (preview && previewInner) {
        document.addEventListener('mousemove', (e) => {
          const { clientX, clientY } = e;
          const { innerWidth, innerHeight } = window;
          
          const rotateY = ((clientX / innerWidth) - 0.5) * 20 - 10;
          const rotateX = ((clientY / innerHeight) - 0.5) * -10 + 3;
          
          gsap.to(previewInner, {
            rotateY: rotateY,
            rotateX: rotateX,
            duration: 1.2,
            ease: 'power2.out',
            overwrite: 'auto'
          });
        });
      }
    }

    // ── CONTINUOUS BLOB MOTION ──
    if (!isMobile) {
      gsap.to('.brand-blob-1', {
        x: 'random(-30, 30)',
        y: 'random(-40, 40)',
        scale: 'random(0.95, 1.05)',
        duration: 'random(8, 12)',
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
      });

      gsap.to('.brand-blob-2', {
        x: 'random(-25, 25)',
        y: 'random(-35, 35)',
        scale: 'random(0.95, 1.05)',
        duration: 'random(10, 14)',
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: 1
      });

      gsap.to('.brand-blob-3', {
        x: 'random(-20, 20)',
        y: 'random(-30, 30)',
        scale: 'random(0.95, 1.05)',
        duration: 'random(9, 13)',
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: 2
      });
    }

    // ── CONTINUOUS FLOATING ICONS ──
    if (!isMobile) {
      document.querySelectorAll('.floating-icon').forEach((icon, i) => {
        gsap.to(icon, {
          y: `random(-15, 15)`,
          x: `random(-10, 10)`,
          rotation: `random(-5, 5)`,
          duration: `random(4, 7)`,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: i * 0.5
        });
      });
    }

    // ── INPUT FOCUS ANIMATIONS ──
    container.querySelectorAll('.input-field').forEach(input => {
      input.addEventListener('focus', () => {
        gsap.to(input, {
          scale: 1.01,
          duration: 0.25,
          ease: 'power2.out'
        });
      });
      input.addEventListener('blur', () => {
        gsap.to(input, {
          scale: 1,
          duration: 0.3,
          ease: 'power3.out'
        });
      });
    });

    // ── CHECKBOX INTERACTION ──
    const checkbox = container.querySelector('.checkbox-wrap input');
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        gsap.fromTo(checkbox, 
          { scale: 0.8 }, 
          { scale: 1, duration: 0.3, ease: 'back.out(3)' }
        );
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
