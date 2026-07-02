/* ═══════════════════════════════════════════════════════════════
   TORAN DNS — Premium Animation System (Advanced)
   GSAP + ScrollTrigger + ScrollToPlugin
   Cinematic scroll storytelling, multi-layer parallax, 3D cards
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const isTablet = window.matchMedia('(max-width: 1024px)') && !isMobile;
  const isDesktop = !isMobile && !isTablet;

  if (isReducedMotion) return;

  gsap.registerPlugin(ScrollTrigger);

  // ── LIVING BACKGROUND SYSTEM ──
  function initLivingBackground() {
    if (isMobile) return;

    // Animate blob colors based on scroll
    gsap.to('.blob-1', {
      backgroundColor: 'rgba(59,130,246,0.5)',
      scrollTrigger: {
        trigger: '#how-it-works',
        start: 'top center',
        end: 'bottom center',
        scrub: 2
      }
    });

    gsap.to('.blob-2', {
      backgroundColor: 'rgba(139,92,246,0.4)',
      scrollTrigger: {
        trigger: '#how-it-works',
        start: 'top center',
        end: 'bottom center',
        scrub: 2
      }
    });

    // Glass reflections parallax
    gsap.to('.glass-reflection-1', {
      y: -150,
      x: 50,
      scrollTrigger: {
        trigger: 'body',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.2 // ponytail: was 3 — 3s of catch-up lag behind actual scroll position read as sluggish
      }
    });

    gsap.to('.glass-reflection-2', {
      y: -200,
      x: -30,
      scrollTrigger: {
        trigger: 'body',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.4 // ponytail: was 4 — same issue, worse
      }
    });

    gsap.to('.glass-reflection-3', {
      y: -100,
      x: 80,
      scrollTrigger: {
        trigger: 'body',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 2
      }
    });

    // Mesh gradient rotation
    gsap.to('.mesh-gradient', {
      rotation: 360,
      scrollTrigger: {
        trigger: 'body',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 2 // ponytail: was 10 — a full 10s smoothing lag on a body-length trigger is the single biggest source of "sluggish" scroll feel in this file
      }
    });
  }

  // ── MULTI-LAYER PARALLAX ──
  function initMultiLayerParallax() {
    if (isMobile) return;

    // Layer 1: Background blobs (slowest)
    gsap.to('.blob-1', {
      y: -80,
      x: 20,
      ease: 'none',
      scrollTrigger: {
        trigger: 'body',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.5
      }
    });

    gsap.to('.blob-2', {
      y: -120,
      x: -30,
      ease: 'none',
      scrollTrigger: {
        trigger: 'body',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 2
      }
    });

    gsap.to('.blob-3', {
      y: -60,
      x: 40,
      ease: 'none',
      scrollTrigger: {
        trigger: 'body',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1
      }
    });

    gsap.to('.blob-4', {
      y: -100,
      x: -20,
      ease: 'none',
      scrollTrigger: {
        trigger: 'body',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 2.5
      }
    });

    // Layer 2: Content sections (medium speed)
    gsap.to('.hero-content', {
      y: -50,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1
      }
    });

    gsap.to('.hero-visual', {
      y: -80,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1.5
      }
    });

    // Layer 3: Feature cards (faster)
    gsap.utils.toArray('.feature-card').forEach((card, i) => {
      gsap.to(card, {
        y: -20 - (i % 3) * 10,
        ease: 'none',
        scrollTrigger: {
          trigger: card,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.5
        }
      });
    });

    // Layer 4: Pricing cards (fastest)
    gsap.utils.toArray('.pricing-card').forEach((card, i) => {
      gsap.to(card, {
        y: -30 - i * 15,
        ease: 'none',
        scrollTrigger: {
          trigger: card,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.3
        }
      });
    });
  }

  // ── SECTION TRANSITIONS ──
  function initSectionTransitions() {
    // Hero → Trust Bar: Scale down + fade
    gsap.fromTo('.hero', 
      { scale: 1, opacity: 1 },
      {
        scale: 0.95,
        opacity: 0.8,
        ease: 'none',
        scrollTrigger: {
          trigger: '.trust-bar',
          start: 'top bottom',
          end: 'top center',
          scrub: 0.5 // ponytail: was 1 — short scroll-distance transitions lag noticeably at scrub>=1, felt delayed
        }
      }
    );

    // Features section: Slide over hero
    gsap.fromTo('#features',
      { y: 100, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: '#features',
          start: 'top bottom',
          end: 'top 60%',
          scrub: 0.5 // ponytail: was 1
        }
      }
    );

    // How it works section: Scale transition
    gsap.fromTo('#how-it-works',
      { scale: 0.9, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: '#how-it-works',
          start: 'top bottom',
          end: 'top 50%',
          scrub: 0.6 // ponytail: was 1.5
        }
      }
    );

    // Pricing section: Slide up with morph
    gsap.fromTo('#pricing',
      { y: 80, opacity: 0, scale: 0.95 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: '#pricing',
          start: 'top bottom',
          end: 'top 60%',
          scrub: 0.5 // ponytail: was 1
        }
      }
    );

    // Footer: Scale up reveal
    gsap.fromTo('footer',
      { scale: 0.95, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: 'footer',
          start: 'top bottom',
          end: 'top 80%',
          scrub: 0.5 // ponytail: was 1, for consistency with the other section reveals above
        }
      }
    );
  }

  // ── PINNED SECTIONS ──
  function initPinnedSections() {
    if (isMobile) return;

    // Pin hero while the trust bar scrolls up over it, then release.
    // pinSpacing MUST be true here: false was collapsing the hero's
    // reserved height in the document flow the instant it pinned, which
    // yanked the trust-bar/features section up and on top of the still-
    // visible pinned hero. With pinSpacing:true a spacer holds the
    // hero's original height, so the trust bar arrives on schedule and
    // slides over the fading/scaling hero (see initSectionTransitions)
    // instead of colliding with it.
    ScrollTrigger.create({
      trigger: '.trust-bar',
      start: 'top bottom',
      end: 'top top',
      pin: '.hero',
      pinSpacing: true
    });
  }

  // ── 3D CARD EFFECTS ──
  function init3DCardEffects() {
    if (isMobile) return;

    const cards = document.querySelectorAll('.feature-card, .pricing-card');
    
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;
        
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
          duration: 0.6,
          ease: 'power3.out',
          overwrite: 'auto'
        });
      });
    });
  }

  // ── MOUSE INTERACTION SYSTEM ──
  function initMouseInteraction() {
    if (isMobile) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let currentX = mouseX;
    let currentY = mouseY;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    // Smooth follow for background blobs
    function updateMouseParallax() {
      const deltaX = (mouseX - currentX) * 0.05;
      const deltaY = (mouseY - currentY) * 0.05;
      
      currentX += deltaX;
      currentY += deltaY;

      gsap.set('.blob-1', { x: deltaX * 2, y: deltaY * 2 });
      gsap.set('.blob-2', { x: deltaX * -1.5, y: deltaY * -1.5 });
      gsap.set('.blob-3', { x: deltaX * 1, y: deltaY * 1 });

      requestAnimationFrame(updateMouseParallax);
    }

    updateMouseParallax();

    // DNS diagram mouse interaction
    const dnsDiagram = document.querySelector('.dns-diagram');
    if (dnsDiagram) {
      document.addEventListener('mousemove', (e) => {
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;
        
        const rotateY = ((clientX / innerWidth) - 0.5) * 10;
        const rotateX = ((clientY / innerHeight) - 0.5) * -5;
        
        gsap.to(dnsDiagram, {
          rotateY: rotateY,
          rotateX: rotateX,
          transformPerspective: 1200,
          duration: 1,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      });
    }
  }

  // ── CONTINUOUS MOTION SYSTEM ──
  function initContinuousMotion() {
    if (isMobile) return;

    // Continuous blob drift
    gsap.to('.blob-1', {
      x: 'random(-40, 40)',
      y: 'random(-50, 50)',
      scale: 'random(0.92, 1.08)',
      duration: 'random(10, 15)',
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    });

    gsap.to('.blob-2', {
      x: 'random(-35, 35)',
      y: 'random(-45, 45)',
      scale: 'random(0.92, 1.08)',
      duration: 'random(12, 18)',
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      delay: 2
    });

    gsap.to('.blob-3', {
      x: 'random(-30, 30)',
      y: 'random(-40, 40)',
      scale: 'random(0.92, 1.08)',
      duration: 'random(11, 16)',
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      delay: 4
    });

    gsap.to('.blob-4', {
      x: 'random(-25, 25)',
      y: 'random(-35, 35)',
      scale: 'random(0.92, 1.08)',
      duration: 'random(13, 20)',
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      delay: 6
    });

    // Continuous glass reflection movement
    gsap.to('.glass-reflection-1', {
      x: 'random(-30, 30)',
      y: 'random(-20, 20)',
      rotation: 'random(-10, 10)',
      duration: 'random(8, 12)',
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    });

    // Floating DNS diagram
    const dnsDiagram = document.querySelector('.dns-diagram');
    if (dnsDiagram) {
      gsap.to(dnsDiagram, {
        y: -15,
        duration: 4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1
      });
    }

    // Floating query rows
    document.querySelectorAll('.dns-query-row').forEach((row, i) => {
      gsap.to(row, {
        x: 4,
        duration: 3 + i * 0.5,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: i * 0.3
      });
    });
  }

  // ── TEXT MASK/LINE REVEALS ──
  function initTextReveals() {
    // Section titles with mask reveal
    gsap.utils.toArray('.section-title').forEach(title => {
      gsap.fromTo(title,
        { clipPath: 'inset(0 0 100% 0)' },
        {
          clipPath: 'inset(0 0 0% 0)',
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: title,
            start: 'top 80%',
            once: true
          }
        }
      );
    });

    // Hero headline with character reveal
    const heroHeadline = document.querySelector('.hero-headline');
    if (heroHeadline && isDesktop) {
      gsap.fromTo(heroHeadline,
        { clipPath: 'inset(0 0 100% 0)' },
        {
          clipPath: 'inset(0 0 0% 0)',
          duration: 1.2,
          ease: 'power4.out',
          delay: 0.3
        }
      );
    }
  }

  // ── HERO ENTRANCE (Advanced) ──
  function animateHero() {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // Nav entrance
    tl.fromTo('.nav-inner', 
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.8 },
      0
    );

    // Badge with scale bounce
    tl.fromTo('.hero-badge',
      { opacity: 0, y: 20, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.4)' },
      0.2
    );

    // Headline with clip reveal
    tl.fromTo('.hero-headline',
      { opacity: 0, y: 40, clipPath: 'inset(0 0 100% 0)' },
      { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 1, ease: 'power4.out' },
      0.35
    );

    // Description
    tl.fromTo('.hero-description',
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.8 },
      0.55
    );

    // Actions with stagger
    tl.fromTo('.hero-actions',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.7 },
      0.7
    );

    // Stats with stagger
    tl.fromTo('.hero-stats .stat-item',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.12 },
      0.85
    );

    tl.fromTo('.hero-stats .stat-divider',
      { opacity: 0, scaleY: 0 },
      { opacity: 1, scaleY: 1, duration: 0.5, stagger: 0.1 },
      0.9
    );

    // Visual with fade reveal
    tl.fromTo('.hero-visual',
      { opacity: 0, x: 50 },
      { opacity: 1, x: 0, duration: 1.2, ease: 'power2.out' },
      0.6
    );

    return tl;
  }

  // ── TRUST BAR ──
  function animateTrustBar() {
    gsap.fromTo('.trust-item',
      { opacity: 0, y: 15 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.trust-bar',
          start: 'top 85%',
          once: true
        }
      }
    );
  }

  // ── FEATURES SECTION ──
  function animateFeatures() {
    const section = document.getElementById('features');
    if (!section) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 75%',
        once: true
      }
    });

    tl.fromTo(section.querySelector('.section-eyebrow'),
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
    );

    tl.fromTo(section.querySelector('.section-title'),
      { opacity: 0, y: 25, clipPath: 'inset(0 0 100% 0)' },
      { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.8, ease: 'power3.out' },
      '-=0.4'
    );

    tl.fromTo(section.querySelector('.section-subtitle'),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
      '-=0.4'
    );

    tl.fromTo(section.querySelectorAll('.feature-card'),
      { opacity: 0, y: 40, scale: 0.95 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.7,
        stagger: 0.06,
        ease: 'power3.out'
      },
      '-=0.3'
    );
  }

  // ── HOW IT WORKS ──
  function animateHowItWorks() {
    const section = document.getElementById('how-it-works');
    if (!section) return;

    const hiwSection = section.querySelector('.hiw-section');
    if (!hiwSection) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 70%',
        once: true
      }
    });

    tl.fromTo(hiwSection.querySelector('.section-eyebrow'),
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
    );

    tl.fromTo(hiwSection.querySelector('.section-title'),
      { opacity: 0, y: 25, clipPath: 'inset(0 0 100% 0)' },
      { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.8, ease: 'power3.out' },
      '-=0.4'
    );

    tl.fromTo(hiwSection.querySelector('.section-subtitle'),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
      '-=0.4'
    );

    tl.fromTo(hiwSection.querySelectorAll('.hiw-step'),
      { opacity: 0, y: 35, scale: 0.95 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.7,
        stagger: 0.12,
        ease: 'power3.out'
      },
      '-=0.3'
    );
  }

  // ── SETUP STRIP ──
  function animateSetupStrip() {
    const strip = document.querySelector('.setup-strip');
    if (!strip) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: strip,
        start: 'top 85%',
        once: true
      }
    });

    tl.fromTo('.setup-strip-inner',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }
    );

    tl.fromTo('.dns-pill',
      { opacity: 0, y: 15, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.4)' },
      '-=0.3'
    );
  }

  // ── PRICING SECTION ──
  function animatePricing() {
    const section = document.getElementById('pricing');
    if (!section) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 75%',
        once: true
      }
    });

    tl.fromTo(section.querySelector('.section-eyebrow'),
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
    );

    tl.fromTo(section.querySelector('.section-title'),
      { opacity: 0, y: 25, clipPath: 'inset(0 0 100% 0)' },
      { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.8, ease: 'power3.out' },
      '-=0.4'
    );

    tl.fromTo(section.querySelector('.section-subtitle'),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
      '-=0.4'
    );

    tl.fromTo(section.querySelectorAll('.pricing-card'),
      { opacity: 0, y: 40, scale: 0.95 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out'
      },
      '-=0.3'
    );
  }

  // ── FOOTER ──
  function animateFooter() {
    const footer = document.querySelector('footer');
    if (!footer) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: footer,
        start: 'top 85%',
        once: true
      }
    });

    tl.fromTo('.footer-brand',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }
    );

    tl.fromTo(footer.querySelectorAll('.footer-top > div'),
      { opacity: 0, y: 15 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power3.out'
      },
      '-=0.4'
    );

    tl.fromTo('.footer-bottom',
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' },
      '-=0.3'
    );
  }

  // ── MICRO INTERACTIONS ──
  function setupMicroInteractions() {
    // Card hover effects
    const cards = document.querySelectorAll('.feature-card, .pricing-card');
    cards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        gsap.to(card, {
          y: -6,
          scale: 1.01,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          y: 0,
          scale: 1,
          rotateX: 0,
          rotateY: 0,
          duration: 0.4,
          ease: 'power3.out',
          overwrite: 'auto'
        });
      });
    });

    // Button hover effects
    const buttons = document.querySelectorAll('.btn-primary-blue, .btn-secondary-hero, .btn-primary, .btn-outline');
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        gsap.to(btn, {
          scale: 1.03,
          y: -2,
          duration: 0.25,
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
        gsap.to(btn, { scale: 1.03, duration: 0.15, ease: 'back.out(2)' });
      });
    });

    // Nav link hover
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('mouseenter', () => {
        gsap.to(link, { y: -1, duration: 0.2, ease: 'power2.out' });
      });
      link.addEventListener('mouseleave', () => {
        gsap.to(link, { y: 0, duration: 0.3, ease: 'power3.out' });
      });
    });
  }

  // ── COUNTER ANIMATION ──
  function animateCounters() {
    const statValues = document.querySelectorAll('.stat-value');
    statValues.forEach(el => {
      const text = el.textContent;
      if (text.match(/^\d/)) {
        const num = parseInt(text);
        if (!isNaN(num) && num > 0) {
          el.textContent = '0';
          gsap.to({ val: 0 }, {
            val: num,
            duration: 1.5,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 85%',
              once: true
            },
            onUpdate: function () {
              el.textContent = Math.round(this.targets()[0].val);
            }
          });
        }
      }
    });
  }

  // ── INIT ──
  function init() {
    // Initialize all systems
    initLivingBackground();
    initMultiLayerParallax();
    initSectionTransitions();
    initPinnedSections();
    init3DCardEffects();
    initMouseInteraction();
    initContinuousMotion();
    initTextReveals();

    // Run entrance animations
    requestAnimationFrame(() => {
      animateHero();
      animateTrustBar();
      animateFeatures();
      animateHowItWorks();
      animateSetupStrip();
      animatePricing();
      animateFooter();
      setupMicroInteractions();
      animateCounters();

      // Refresh ScrollTrigger after all animations are set up
      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 100);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
