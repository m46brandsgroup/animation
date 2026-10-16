function initScrollReveal(selector = '[data-scroll-reveal]', globalDefaults = {}) {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return null;

  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    document.querySelectorAll(selector).forEach(el => {
      const mode = el.dataset.mode || globalDefaults.mode || 'scrub';
      const effect = el.dataset.effect || globalDefaults.effect || 'fade';
      const splitBy = el.dataset.splitBy || globalDefaults.splitBy || 'words';
      const baseColor = el.dataset.baseColor || globalDefaults.baseColor || '#64748b';
      const finalColor = el.dataset.finalColor || globalDefaults.finalColor || '#ffffff';
      const baseOpacity = parseFloat(el.dataset.baseOpacity ?? globalDefaults.baseOpacity ?? '0.2');
      const stagger = parseFloat(el.dataset.stagger ?? globalDefaults.stagger ?? '0.05');
      const duration = parseFloat(el.dataset.duration ?? globalDefaults.duration ?? '0.8');
      const blur = parseFloat(el.dataset.blur ?? globalDefaults.blur ?? '4');
      const rotation = parseFloat(el.dataset.rotation ?? globalDefaults.rotation ?? '3');
      const offset = parseFloat(el.dataset.offset ?? globalDefaults.offset ?? '0');
      const start = el.dataset.start || globalDefaults.start || 'top 85%';
      const end = el.dataset.end || globalDefaults.end || 'center center';
      const scrub = el.dataset.scrub !== undefined ? (parseFloat(el.dataset.scrub) || true) : (globalDefaults.scrub ?? 1);
      const pin = el.dataset.pin === 'true' || globalDefaults.pin === true;
      const markers = el.dataset.markers === 'true' || globalDefaults.markers === true;

      const rawText = el.textContent.trim();
      if (!el.getAttribute('aria-label')) {
        el.setAttribute('aria-label', rawText);
      }

      let wordHtml = '';
      rawText.split(/(\s+)/).forEach(token => {
        if (token.trim() === '') {
          wordHtml += token;
        } else if (splitBy === 'chars') {
          const chars = Array.from(token).map(c => `<span class="scroll-reveal-piece">${c}</span>`).join('');
          wordHtml += `<span class="scroll-reveal-word">${chars}</span>`;
        } else {
          wordHtml += `<span class="scroll-reveal-word"><span class="scroll-reveal-piece">${token}</span></span>`;
        }
      });

      el.innerHTML = `<span class="scroll-reveal-text" aria-hidden="true">${wordHtml}</span>`;

      const textEl = el.querySelector('.scroll-reveal-text');
      const wordEls = Array.from(el.querySelectorAll('.scroll-reveal-word'));

      const lineGroups = [];
      let currentLine = [];
      let currentTop = -Infinity;

      wordEls.forEach(word => {
        const top = word.offsetTop;
        if (Math.abs(top - currentTop) > 4) {
          if (currentLine.length) lineGroups.push(currentLine);
          currentLine = [word];
          currentTop = top;
        } else {
          currentLine.push(word);
        }
      });
      if (currentLine.length) lineGroups.push(currentLine);

      lineGroups.forEach(group => {
        const lineSpan = document.createElement('span');
        lineSpan.className = 'scroll-reveal-line';
        textEl.insertBefore(lineSpan, group[0]);
        group.forEach((w, i) => {
          lineSpan.appendChild(w);
          if (i < group.length - 1) {
            lineSpan.appendChild(document.createTextNode(' '));
          }
        });
      });

      Array.from(textEl.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) node.remove();
      });

      const lines = el.querySelectorAll('.scroll-reveal-line');
      const pieces = el.querySelectorAll('.scroll-reveal-piece');
      const wrappers = el.querySelectorAll('.scroll-reveal-word');

      gsap.set(pieces, {
        force3D: true,
        backfaceVisibility: 'hidden',
        willChange: 'transform, opacity, filter, color'
      });

      if (lines.length) {
        gsap.set(lines, {
          force3D: true,
          transformOrigin: '0% 50%',
          willChange: 'transform'
        });
      }

      const fromProps = {
        opacity: baseOpacity,
        color: baseColor,
        filter: blur > 0 ? `blur(${blur}px)` : 'blur(0px)',
        y: offset
      };

      if (effect === 'rise') {
        fromProps.y = offset || 28;
        wrappers.forEach(w => { w.style.clipPath = 'inset(-1em -1em -0.15em -1em)'; });
      } else if (effect === 'flip') {
        fromProps.rotateX = 90;
        pieces.forEach(p => { p.style.transformOrigin = '50% 100%'; });
      } else if (effect === 'scale') {
        fromProps.scale = 0.4;
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: start,
          end: end,
          scrub: mode === 'scrub' ? scrub : false,
          pin: pin,
          markers: markers,
          invalidateOnRefresh: true,
          fastScrollEnd: true,
          toggleActions: mode === 'enter' ? 'play none none reverse' : undefined
        }
      });

      if (rotation !== 0 && lines.length > 0) {
        tl.fromTo(lines,
          { rotate: rotation },
          {
            rotate: 0,
            ease: 'none',
            stagger: {
              each: Math.max(stagger * 2.5, 0.1),
              from: 'start'
            },
            duration: 0.8
          },
          0
        );
      }

      tl.fromTo(pieces,
        fromProps,
        {
          opacity: 1,
          color: finalColor,
          filter: 'blur(0px)',
          y: 0,
          rotateX: 0,
          scale: 1,
          stagger: { each: stagger, from: 'start', ease: 'none' },
          ease: mode === 'enter' ? 'power2.out' : 'power1.inOut',
          duration: mode === 'enter' ? duration : 1
        },
        0
      );
    });

    ScrollTrigger.refresh();
  });

  return mm;
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal('[data-scroll-reveal]');
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = initScrollReveal;
}