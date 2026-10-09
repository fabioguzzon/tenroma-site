/* ═══════════════════════════════════════════════════════════
   TEN · A Matter of Perspective — regia dello scroll
   GSAP 3.13 + ScrollTrigger + SplitText + Lenis (tutti in assets/vendor)
   ═══════════════════════════════════════════════════════════ */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motion = !reduced && window.gsap && window.ScrollTrigger && window.SplitText;
  const isMobile = () => innerWidth < 900;
  // iPhone/iPad: niente Lenis né grana, scroll seguito più da vicino (lo scrub lungo al tocco sembra a scatti)
  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const SCRUB = isTouch ? .35 : 1;

  /* ── Asset originali mancanti → segnaposto dichiarato ─────── */
  $$('img[data-placeholder]').forEach(img => {
    const fig = img.parentElement;
    const mark = () => { fig.classList.add('is-missing'); fig.dataset.name = img.dataset.placeholder; };
    img.addEventListener('error', mark, { once: true });
    if (img.complete && img.naturalWidth === 0) mark();
  });

  /* ── Video: hero subito (sorgente per orientamento), gli altri pigri ── */
  const hv = $('.hero__video');
  if (hv) {
    const port = matchMedia('(orientation: portrait)').matches;
    if (port && hv.dataset.posterPort) hv.poster = hv.dataset.posterPort;
    hv.src = port ? hv.dataset.srcPort : hv.dataset.srcLand;
    hv.addEventListener('error', () => hv.removeAttribute('src'), { once: true });
    hv.play().catch(() => {});
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(({ target: v, isIntersecting }) => {
      if (isIntersecting) {
        if (!v.src && v.dataset.src) v.src = v.dataset.src;
        v.play().catch(() => {});
      } else if (!v.paused) v.pause();
    });
  }, { rootMargin: '300px 0px' });
  $$('.lazy-video').forEach(v => io.observe(v));

  /* ── Menu ─────────────────────────────────────────────────── */
  const burger = $('.nav__burger');
  const menu = $('#menu');
  const setMenu = open => {
    body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', !open);
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  burger.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  addEventListener('keydown', e => { if (e.key === 'Escape' && body.classList.contains('menu-open')) setMenu(false); });

  /* ── Colore montatura: nero / tartaruga ───────────────────── */
  $$('.frame__colors button').forEach(btn => btn.addEventListener('click', () => {
    const frame = btn.closest('.frame');
    frame.dataset.color = btn.dataset.c;
    $$('.frame__colors button', frame).forEach(b => b.setAttribute('aria-pressed', b === btn));
  }));

  /* ── Form candidatura ─────────────────────────────────────── */
  const form = $('.form');
  // la candidatura diventa un unico testo leggibile, uguale per endpoint ed email
  const applicationText = fd => [
    `Name: ${fd.get('first_name')} ${fd.get('last_name')}`,
    `Email: ${fd.get('email')}`,
    `City: ${fd.get('city') || '-'}`,
    `Profession: ${fd.get('profession') || '-'}`,
    `Frame: ${fd.get('frame') || '-'}`,
    '',
    'Perspective:',
    fd.get('perspective') || '-',
  ].join('\n');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $('.form__msg', form);
    if (!form.checkValidity()) { form.reportValidity(); msg.textContent = 'Please complete the required fields.'; return; }
    const fd = new FormData(form);
    const { endpoint, mailto } = form.dataset;
    if (endpoint) {
      msg.textContent = 'Sending…';
      try {
        // corpo form-urlencoded: richiesta "semplice", nessun preflight CORS
        const r = await fetch(endpoint, { method: 'POST', body: new URLSearchParams(fd) });
        const data = await r.json().catch(() => ({}));
        if (r.status === 429) { msg.textContent = 'Too many attempts. Please try again in an hour.'; return; }
        if (!r.ok || !data.ok) throw new Error(r.status);
        form.reset();
        msg.textContent = 'Thank you. We read every application personally, and we will reply.';
      } catch {
        msg.textContent = mailto
          ? 'We could not send it automatically. Your email app will open with your application ready.'
          : 'Something went wrong. Please try again in a moment.';
        if (mailto) location.href = `mailto:${mailto}?subject=${encodeURIComponent('TEN · Application')}&body=${encodeURIComponent(applicationText(fd))}`;
      }
    } else if (mailto) {
      location.href = `mailto:${mailto}?subject=${encodeURIComponent('TEN · Application')}&body=${encodeURIComponent(applicationText(fd))}`;
      msg.textContent = 'Your email app is opening with your application ready to send.';
    } else {
      msg.textContent = 'Applications open soon. Thank you for your interest.';
    }
  });

  /* ── Tema chiaro/scuro e rail capitoli: chi sta a metà schermo ── */
  const themed = $$('[data-theme]');
  const chapters = $$('[data-chapter]');
  const rail = $('.rail');
  const railItems = $$('.rail li');
  const railLabel = $('.rail__label');
  const boxOf = el => (el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el).getBoundingClientRect();
  let ticking = false;
  const sync = () => {
    ticking = false;
    const mid = innerHeight / 2;
    for (const el of themed) {
      const b = boxOf(el);
      if (b.top <= mid && b.bottom >= mid) { if (body.dataset.theme !== el.dataset.theme) body.dataset.theme = el.dataset.theme; break; }
    }
    const navY = 36;
    for (const el of themed) {
      const b = boxOf(el);
      if (b.top <= navY && b.bottom >= navY) { if (body.dataset.nav !== el.dataset.theme) body.dataset.nav = el.dataset.theme; break; }
    }
    let active = null;
    for (const el of chapters) { const b = boxOf(el); if (b.top <= mid && b.bottom >= mid) { active = el; break; } }
    rail.classList.toggle('is-on', !!active);
    const key = active && (active.dataset.rail || active.id);
    railItems.forEach(li => li.classList.toggle('is-active', li.dataset.for === key));
    if (active) railLabel.textContent = active.dataset.title;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(sync); } }, { passive: true });
  addEventListener('resize', sync);
  body.dataset.theme = 'dark';

  /* ── Cursore ──────────────────────────────────────────────── */
  const cur = $('.cursor');
  if (cur && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const label = $('.cursor__label', cur);
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; cur.classList.add('is-on'); }, { passive: true });
    document.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
    document.addEventListener('pointerover', e => {
      const t = e.target.closest('a, button, label, .frame');
      cur.classList.toggle('is-link', !!t);
      label.textContent = t && t.closest('.frame') ? 'View' : '';
    });
    const loop = () => { cx += (x - cx) * .18; cy += (y - cy) * .18; cur.style.transform = `translate3d(${cx}px, ${cy}px, 0)`; requestAnimationFrame(loop); };
    loop();
  }

  /* ── Ancore interne: chiudono il menu e scorrono (morbido solo se c'è Lenis) ── */
  let lenis = null;
  const tracks = new Map(); // traccia orizzontale → suo ScrollTrigger (desktop)
  // dentro una traccia orizzontale la meta è una quota di scroll, non la posizione verticale dell'elemento
  const horizontalY = el => {
    for (const [track, st] of tracks) {
      if (!track.contains(el)) continue;
      const left = el.offsetLeft - (innerWidth - el.offsetWidth) / 2;
      return Math.min(st.end, Math.max(st.start, st.start + left));
    }
    return null;
  };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    if (body.classList.contains('menu-open')) setMenu(false);
    const hy = target ? horizontalY(target) : null;
    if (lenis) lenis.scrollTo(hy ?? target, { duration: 1.8, easing: t => 1 - Math.pow(1 - t, 4) });
    else if (hy !== null) scrollTo(0, hy);
    else if (target === 0) scrollTo(0, 0);
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }));

  /* ═════════ Senza movimento: tutto statico e leggibile ═════════ */
  const staticMode = () => {
    document.documentElement.classList.add('is-static');
    $('.loader')?.remove();
    body.classList.remove('is-loading');
    sync();
  };
  if (!motion) {
    staticMode();
    return;
  }

  document.documentElement.classList.add('js-motion');
  gsap.registerPlugin(ScrollTrigger, SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ── Lenis: scroll morbido collegato al ticker GSAP ───────── */
  if (window.Lenis && !isTouch) {
    lenis = new Lenis({ lerp: .085, smoothWheel: true, wheelMultiplier: .9 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  /* ── Loader: conta da I a X, poi si apre ──────────────────── */
  const NUM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const numEl = $('.loader__num');
  const counter = { v: 0 };

  const heroIntro = () => {
    body.classList.remove('is-loading');
    lenis?.start();
    gsap.from('.hero__xin', { scale: .5, svgOrigin: '800 450', duration: 2.2, ease: 'expo.out' });
    gsap.from('.hero__word .hl', { yPercent: 120, opacity: 0, duration: 1.6, ease: 'expo.out', stagger: .09, delay: .15 });
    gsap.from('.hero__sub, .hero__tag, .hero__meta, .hero__scroll', { opacity: 0, duration: 1.6, ease: 'power2.out', stagger: .12, delay: .7 });
  };

  document.fonts.ready.then(() => {
    try {
      build();
    } catch (err) {
      // la regia non deve mai chiudere il sito: si torna alla pagina statica
      console.error('TEN motion disabled:', err);
      ScrollTrigger.getAll().forEach(t => t.kill(true));
      gsap.globalTimeline.clear();
      $$('.gen__curtain').forEach(el => el.remove());
      $$('main [style], footer [style]').forEach(el => el.removeAttribute('style'));
      gsap.set('.manifesto', { display: 'none' });
      lenis?.start();
      staticMode();
      return;
    }
    gsap.timeline()
      .to('.loader__bar i', { scaleX: 1, duration: 1.6, ease: 'power2.inOut' }, 0)
      .to(counter, { v: 9, duration: 1.6, ease: 'power2.inOut', onUpdate: () => { numEl.textContent = NUM[Math.round(counter.v)]; } }, 0)
      .to('.loader', { yPercent: -100, duration: 1.15, ease: 'expo.inOut' }, '+=.3')
      .add(heroIntro, '-=.55')
      .add(() => { $('.loader')?.remove(); sync(); });
  });

  /* ═════════ Coreografia ═════════ */
  function build() {

    /* HERO · la X si apre su Roma, poi il manifesto */
    const groups = $$('.manifesto__group');
    const htl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.hero', start: 'top top',
        end: () => '+=' + innerHeight * (isMobile() ? 3.4 : 4.2),
        pin: true, scrub: SCRUB, invalidateOnRefresh: true,
      },
    });
    htl.to('.hero__ui', { opacity: 0, duration: .5 }, 0)
      .to('.hero__word .hl-t', { xPercent: -170, duration: 2 }, 0)
      .to('.hero__word .hl-n', { xPercent: 170, duration: 2 }, 0)
      .to('.hero__word .hl-e', { y: -60, duration: 2 }, 0)
      .to('.hero__sub', { opacity: 0, duration: .5 }, 0)
      .to('.hero__brand', { opacity: 0, duration: 1.1 }, .5)
      .to('.hero__x', { scale: 70, svgOrigin: '800 450', duration: 3, ease: 'power3.in' }, 0)
      .to('.hero__veil', { opacity: 0, duration: .5 }, 2.6)
      .to('.hero__video', { scale: 1, duration: 3.4 }, 0)
      .to('.hero__dim', { opacity: .52, duration: 1 }, 3);
    let t = 3.4;
    groups.forEach((g, k) => {
      const lines = $$('.ml > span', g);
      htl.set(g, { visibility: 'visible' }, t)
        .fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: 1, stagger: .28, ease: 'power3.out' }, t);
      if (k < groups.length - 1) htl.to(lines, { yPercent: -110, duration: .8, stagger: .12, ease: 'power2.in' }, t + 2.1);
      t += 3.1;
    });
    htl.to({}, { duration: .8 });

    /* Titoli: righe che salgono da una maschera */
    $$('.split').forEach(el => {
      const st = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'line' });
      gsap.from(st.lines, {
        yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: .1,
        scrollTrigger: { trigger: el, start: 'top 86%', once: true },
        onComplete: () => st.revert(),
      });
    });
    $$('.reveal').forEach(el => gsap.from(el, {
      y: 40, opacity: 0, duration: 1.3, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    }));

    /* I · contatore romano I → X */
    // il contatore scatta da un numerale all'altro, come un rullo: mai due numerali a metà
    const reel = $('.name__reel');
    let shown = 0;
    ScrollTrigger.create({
      trigger: '.name__grid', start: 'top 80%', end: 'bottom 30%',
      onUpdate: self => {
        const idx = Math.round(self.progress * 9);
        if (idx === shown) return;
        shown = idx;
        gsap.to(reel, { yPercent: -idx * 10, duration: .55, ease: 'power3.out', overwrite: true });
      },
    });
    gsap.fromTo('.name__stone', { scale: isMobile() ? .92 : .84 }, {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: '.name__stone', start: 'top 95%', end: 'top 5%', scrub: true },
    });
    gsap.fromTo('.name__stone img, .name__motion', { yPercent: -18 }, {
      yPercent: 0, ease: 'none',
      scrollTrigger: { trigger: '.name__stone', start: 'top bottom', end: 'bottom top', scrub: true },
    });

    /* Marquee: gira da solo, accelera con la velocità dello scroll */
    const mq = gsap.to('.marquee__track', { xPercent: -50, repeat: -1, duration: 38, ease: 'none' });
    ScrollTrigger.create({
      trigger: '.marquee', start: 'top bottom', end: 'bottom top',
      onUpdate: self => {
        const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 260, 7);
        gsap.to(mq, { timeScale: boost, duration: .2, overwrite: true });
        gsap.to(mq, { timeScale: 1, duration: 1.4, delay: .2 });
      },
    });

    const mm = gsap.matchMedia();

    /* II · Roma e VII · Collezione: scorrimento orizzontale (desktop) */
    mm.add('(min-width: 900px)', () => {
      const horizontal = (section, track, inner) => {
        const dist = () => Math.max(0, track.scrollWidth - innerWidth);
        const tw = gsap.to(track, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: { trigger: section, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true },
        });
        tracks.set(track, tw.scrollTrigger);
        inner(tw);
      };
      horizontal($('.rome'), $('.rome__track'), tw => {
        $$('.rome__img img').forEach(img => gsap.fromTo(img, { xPercent: -10 }, {
          xPercent: 0, ease: 'none',
          scrollTrigger: { trigger: img.parentElement, containerAnimation: tw, start: 'left right', end: 'right left', scrub: true },
        }));
        $$('.rome__panel figcaption').forEach(c => gsap.from(c, {
          opacity: 0, y: 20, duration: 1,
          scrollTrigger: { trigger: c, containerAnimation: tw, start: 'left 85%', toggleActions: 'play none none reverse' },
        }));
      });
      horizontal($('.collection'), $('.collection__track'), tw => {
        $$('.frame').forEach(f => {
          gsap.fromTo($('.frame__img', f), { rotateY: 14, scale: .92 }, {
            rotateY: -10, scale: 1, ease: 'none',
            scrollTrigger: { trigger: f, containerAnimation: tw, start: 'left right', end: 'right left', scrub: true },
          });
          gsap.from($('.frame__meta', f), {
            opacity: 0, y: 30, duration: 1,
            scrollTrigger: { trigger: f, containerAnimation: tw, start: 'left 75%', toggleActions: 'play none none reverse' },
          });
        });
      });
      return () => tracks.clear();
    });
    mm.add('(max-width: 899px)', () => {
      $$('.rome__img img').forEach(img => gsap.fromTo(img, { yPercent: -12 }, {
        yPercent: 0, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      }));
    });

    /* III · Le quattro generazioni: pagine che si impilano */
    const gens = $$('.gen');
    gens.forEach((g, i) => {
      g.style.zIndex = i + 1;
      const photo = $('.gen__photo', g);
      const curtain = document.createElement('div');
      curtain.className = 'gen__curtain';
      photo.appendChild(curtain);
      gsap.fromTo(curtain, { scaleY: 1 }, {
        scaleY: 0, ease: 'none',
        scrollTrigger: { trigger: g, start: 'top 90%', end: 'top 10%', scrub: true },
      });
      gsap.fromTo($('img', photo), { scale: 1.3 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: g, start: 'top bottom', end: 'top top', scrub: true },
      });
      gsap.from($$('.gen__ord, .gen__name, .gen__sub, .gen__text, .gen__it, .gen__frame', g), {
        y: 50, opacity: 0, duration: 1.2, ease: 'power3.out', stagger: .08,
        scrollTrigger: { trigger: g, start: 'top 40%', toggleActions: 'play none none reverse' },
      });
      gsap.fromTo($('.gen__num', g), { yPercent: 25 }, {
        yPercent: -15, ease: 'none',
        scrollTrigger: { trigger: g, start: 'top bottom', end: 'bottom top', scrub: true },
      });
      if (i < gens.length - 1) {
        ScrollTrigger.create({ trigger: g, start: 'top top', endTrigger: gens[gens.length - 1], end: 'top top', pin: true, pinSpacing: false });
        gsap.to($('.gen__in', g), {
          scale: .9, opacity: .25, ease: 'none',
          scrollTrigger: { trigger: gens[i + 1], start: 'top bottom', end: 'top top', scrub: true },
        });
      }
    });

    /* IV · Quinta storia */
    gsap.fromTo('.fifth__media img', { scale: 1.25, yPercent: -6 }, {
      scale: 1, yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: '.fifth', start: 'top bottom', end: 'bottom top', scrub: true },
    });
    gsap.fromTo('.fifth__v', { yPercent: -20, opacity: 0 }, {
      yPercent: -80, opacity: 1, ease: 'none',
      scrollTrigger: { trigger: '.fifth', start: 'top 70%', end: 'bottom top', scrub: true },
    });
    const yours = SplitText.create('.fifth__yours em', { type: 'chars' });
    gsap.from(yours.chars, {
      opacity: 0, y: 30, rotateX: -60, duration: 1, ease: 'power3.out', stagger: .035,
      scrollTrigger: { trigger: '.fifth__yours', start: 'top 85%', once: true },
    });

    /* V · status → stature */
    const swap = $('.w-swap');
    const us = $('.w-us');
    const ure = $('.w-ure');
    const stl = gsap.timeline({
      scrollTrigger: {
        trigger: '.stature__pin', start: 'top top', end: () => '+=' + innerHeight * 1.4,
        pin: true, scrub: SCRUB, invalidateOnRefresh: true,
      },
    });
    stl.to({}, { duration: .35 })
      .to('.pre-a', { opacity: 0, yPercent: -50, duration: .45 }, .35)
      .fromTo('.pre-b', { opacity: 0, yPercent: 50 }, { opacity: 1, yPercent: 0, duration: .45 }, .6)
      .to(us, { yPercent: 105, duration: .5, ease: 'power2.in' }, .35)
      .fromTo(ure, { yPercent: -105 }, { yPercent: 0, duration: .6, ease: 'power3.out' }, .75)
      .fromTo(swap, { width: () => us.offsetWidth }, { width: () => ure.offsetWidth, duration: .6, ease: 'power3.inOut', immediateRender: true }, .55)
      .to({}, { duration: .5 });

    $$('.values__list li').forEach(li => ScrollTrigger.create({ trigger: li, start: 'top 50%', end: 'bottom 50%', toggleClass: 'is-on' }));

    gsap.fromTo('.table', { scale: isMobile() ? 1 : .88 }, {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: '.table', start: 'top bottom', end: 'top top', scrub: true },
    });
    gsap.fromTo('.table__img img', { scale: 1.2 }, {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: '.table', start: 'top bottom', end: 'bottom top', scrub: true },
    });

    /* VI · Mestiere */
    $$('.craft__details img').forEach(img => gsap.fromTo(img, { yPercent: -16 }, {
      yPercent: 0, ease: 'none',
      scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    }));
    mm.add('(min-width: 900px)', () => {
      gsap.fromTo('.craft__details', { y: 160 }, {
        y: -120, ease: 'none',
        scrollTrigger: { trigger: '.craft', start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    /* VII · L'oggetto: frontale → tre quarti → laterale, con le sue caratteristiche */
    const views = $$('.object__view');
    const notes = $$('.object__notes li');
    gsap.set(notes.slice(1), { opacity: 0, y: 24 });
    const otl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: { trigger: '.object', start: 'top top', end: () => '+=' + innerHeight * 2.4, pin: true, scrub: SCRUB, invalidateOnRefresh: true },
    });
    otl.fromTo('.object__stage', { scale: .88 }, { scale: 1, duration: 1 }, 0);
    [1, 2].forEach((v, k) => {
      const t = 1.2 + k * 1.4;
      otl.to(views[v - 1], { opacity: 0, scale: 1.04, duration: .6 }, t)
        .fromTo(views[v], { opacity: 0, scale: .96, xPercent: 4 }, { opacity: 1, scale: 1, xPercent: 0, duration: .7 }, t)
        .to(notes[v - 1], { opacity: 0, y: -24, duration: .4 }, t)
        .to(notes[v], { opacity: 1, y: 0, duration: .5 }, t + .3);
    });
    otl.to({}, { duration: .6 });

    /* VIII · Valore */
    gsap.from('.value__words li', {
      opacity: 0, y: 24, duration: 1, stagger: .12, ease: 'power3.out',
      scrollTrigger: { trigger: '.value__words', start: 'top 88%', once: true },
    });

    /* IX · Il percorso: la linea si disegna, i passi si accendono */
    const steps = $$('.journey__steps li');
    const fill = $('.journey__line i');
    ScrollTrigger.create({
      trigger: '.journey__road', start: 'top 75%', end: isMobile() ? 'bottom 55%' : 'top 25%', scrub: true,
      onUpdate: self => {
        const p = self.progress;
        gsap.set(fill, isMobile() ? { scaleY: p } : { scaleX: p });
        steps.forEach((li, k) => li.classList.toggle('is-on', p >= k / (steps.length - 1) - .02));
      },
    });

    /* X · Candidatura e firma */
    gsap.fromTo('.apply__x', { rotate: -8, scale: .85 }, {
      rotate: 4, scale: 1.05, ease: 'none',
      scrollTrigger: { trigger: '.apply', start: 'top bottom', end: 'bottom top', scrub: true },
    });
    gsap.from('.foot__word', {
      yPercent: 40, opacity: 0, duration: 1.6, ease: 'expo.out',
      scrollTrigger: { trigger: '.foot', start: 'top 80%', once: true },
    });
    gsap.fromTo('.foot__x', { scale: .6, rotate: -12 }, {
      scale: 1, rotate: 0, ease: 'none',
      scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true },
    });

    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    addEventListener('load', () => ScrollTrigger.refresh());
    sync();
  }
})();
