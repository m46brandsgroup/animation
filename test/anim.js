/*--anim1--*/
 function AnimatedList(target = '[data-animated-list], [data-animated-item]', options = {}) {
  const gsap = window.gsap;
  if (!gsap) return [];

  if (window.ScrollTrigger) {
    gsap.registerPlugin(window.ScrollTrigger);
  }

  const opts = {
    stagger: 0.1,
    duration: 0.55,
    ease: 'back.out(1.4)',
    scale: 0.6,
    y: 14,
    start: 'top 85%',
    once: true,
    ...options
  };

  const elements = typeof target === 'string'
    ? document.querySelectorAll(target)
    : target instanceof NodeList || Array.isArray(target)
      ? target
      : [target];

  const animations = [];

  elements.forEach(container => {
    if (!container) return;
    const items = container.children && container.children.length > 0
      ? Array.from(container.children)
      : [container];

    if (!items.length) return;

    const speed = container.dataset.speed ? parseFloat(container.dataset.speed) : 1;
    const stagger = (container.dataset.stagger ? parseFloat(container.dataset.stagger) : opts.stagger) / speed;
    const duration = (container.dataset.duration ? parseFloat(container.dataset.duration) : opts.duration) / speed;
    const delay = container.dataset.delay ? parseFloat(container.dataset.delay) : (opts.delay || 0);
    const start = container.dataset.start || opts.start;
    const once = container.dataset.once !== undefined ? container.dataset.once === 'true' : opts.once;

    if (window.ScrollTrigger && typeof ScrollTrigger.batch === 'function') {
      gsap.set(items, { scale: opts.scale, y: opts.y, opacity: 0 });

      const batch = ScrollTrigger.batch(items, {
        start,
        once,
        onEnter: batchElements => {
          gsap.to(batchElements, {
            scale: 1,
            y: 0,
            opacity: 1,
            duration,
            delay,
            ease: opts.ease,
            stagger,
            overwrite: 'auto'
          });
        },
        ...(!once ? {
          onLeaveBack: batchElements => {
            gsap.to(batchElements, {
              scale: opts.scale,
              y: opts.y,
              opacity: 0,
              duration: 0.3,
              overwrite: 'auto'
            });
          }
        } : {})
      });
      animations.push(batch);
    } else if (window.ScrollTrigger) {
      items.forEach((item, idx) => {
        const tween = gsap.fromTo(
          item,
          { scale: opts.scale, y: opts.y, opacity: 0 },
          {
            scale: 1,
            y: 0,
            opacity: 1,
            duration,
            delay: delay + (idx * stagger),
            ease: opts.ease,
            overwrite: 'auto',
            scrollTrigger: {
              trigger: item,
              start,
              once
            }
          }
        );
        animations.push(tween);
      });
    } else {
      const tween = gsap.fromTo(
        items,
        { scale: opts.scale, y: opts.y, opacity: 0 },
        {
          scale: 1,
          y: 0,
          opacity: 1,
          duration,
          delay,
          ease: opts.ease,
          stagger,
          overwrite: 'auto'
        }
      );
      animations.push(tween);
    }
  });

  return animations;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AnimatedList());
  } else {
    AnimatedList();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnimatedList;
} else {
  window.AnimatedList = AnimatedList;
}

 /*--anim2--*/
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
/*--anim3--*/  
function initFadeContent(selector = '[data-fade-content]', globalDefaults = {}) {
  const DEFAULT_SETTINGS = {
    effect: 'mist',            // 'fade' | 'mist' | 'dissolve' | 'pixel' | 'focus' | 'develop'
    duration: 1.8,             // Duration in seconds
    ease: 'power2.out',        // Easing function
    delay: 0,                  // Delay before start (in seconds)
    stagger: 0.1,              // Stagger delay between child elements (in seconds)
    staggerFrom: 'start',      // 'start' | 'center' | 'end' | 'edges' | 'random'
    threshold: 0.1,            // Visibility threshold to trigger (0 - 1)
    initialOpacity: 0,         // Starting opacity (0 - 1)
    trigger: 'scroll',         // 'scroll' | 'mount'
    once: true,                // If true, animates once; if false, reverses on scroll back
    exit: false,               // If true, animates out when scrolling past
    pin: false,                // Pin element during animation
    markers: false,            // ScrollTrigger debug markers
    scrub: false,              // Link animation progress to scrollbar (boolean or number)
    blur: false,               // Add blur effect: boolean or number in pixels
    disappearAfter: 0,         // Disappear after seconds (0 to disable)
    disappearDuration: 0.5,    // Duration of disappearance animation
    disappearEase: 'power2.in',// Easing of disappearance animation
    container: null,           // Custom scroll container selector
    start: null,               // Custom ScrollTrigger start position
    end: null,                 // Custom ScrollTrigger end position
    toggleActions: null        // Custom ScrollTrigger toggle actions
  };

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return null;

  gsap.registerPlugin(ScrollTrigger);

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const NOISE_EFFECTS = ['dissolve', 'mist', 'pixel'];
  const LEVELS = Array.from({ length: 33 }, (_, i) => 1 / (1 + Math.exp(-10.8 * (i / 32 - 0.5))));
  let maskCount = 0;

  const toSeconds = val => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') {
      return val > 10 ? val / 1000 : val;
    }
    const str = String(val).trim();
    const num = parseFloat(str);
    if (isNaN(num)) return 0;
    if (str.endsWith('ms')) return num / 1000;
    return num > 10 && !str.endsWith('s') ? num / 1000 : num;
  };

  const clamp01 = val => Math.min(Math.max(val, 0), 1);
  const smoothstep = (from, to, val) => {
    const t = clamp01((val - from) / (to - from));
    return t * t * (3 - 2 * t);
  };

  const noiseFor = (kind, size) => {
    if (kind === 'mist') {
      return { frequency: Math.min(Math.max(4 / size, 0.004), 0.02), octaves: 3, edge: 0.35, blur: 10, block: 0 };
    }
    if (kind === 'pixel') {
      const block = 2 * Math.round(Math.min(Math.max(size / 32, 6), 24) / 2);
      return { frequency: 0.5 / block, octaves: 1, edge: 0.06, blur: 0, block };
    }
    return { frequency: 0.6, octaves: 1, edge: 0.15, blur: 0, block: 0 };
  };

  const createNoiseMask = (target, kind, floor, extraBlur) => {
    const box = target.getBoundingClientRect();
    const size = Math.sqrt(Math.max(box.width * box.height, 1));
    const cfg = noiseFor(kind, size);

    const node = (name, attrs, parent) => {
      const el = document.createElementNS(SVG_NS, name);
      for (const k in attrs) el.setAttribute(k, String(attrs[k]));
      parent.appendChild(el);
      return el;
    };

    const svg = node('svg', { width: 0, height: 0, 'aria-hidden': 'true' }, document.body);
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';

    const maskId = `fade-content-mask-${++maskCount}`;
    const filter = node(
      'filter',
      { id: maskId, x: '-10%', y: '-10%', width: '120%', height: '120%', 'color-interpolation-filters': 'sRGB' },
      svg
    );

    node(
      'feTurbulence',
      { type: 'fractalNoise', baseFrequency: cfg.frequency, numOctaves: cfg.octaves, seed: Math.floor(Math.random() * 1000), result: 'noise' },
      filter
    );

    let source = 'noise';
    if (cfg.block > 0) {
      const dot = cfg.block / 2 - 1;
      node('feColorMatrix', { in: 'noise', type: 'matrix', values: '1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 0 1', result: 'gray' }, filter);
      node('feFlood', { x: dot, y: dot, width: 2, height: 2, 'flood-color': '#000', result: 'dot' }, filter);
      node('feComposite', { in: 'dot', in2: 'dot', width: cfg.block, height: cfg.block, result: 'cell' }, filter);
      node('feTile', { in: 'cell', result: 'grid' }, filter);
      node('feComposite', { in: 'gray', in2: 'grid', operator: 'in', result: 'samples' }, filter);
      node('feMorphology', { in: 'samples', operator: 'dilate', radius: dot, result: 'blocks' }, filter);
      source = 'blocks';
    }

    node('feColorMatrix', { in: source, type: 'matrix', values: '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.43 0 0 0 -0.21' }, filter);
    const curve = node('feFuncA', { type: 'table' }, node('feComponentTransfer', { result: 'mask' }, filter));
    node('feComposite', { in: 'SourceGraphic', in2: 'mask', operator: 'in' }, filter);

    const url = `url(#${maskId})`;
    const blurFrom = cfg.blur + extraBlur;
    const state = { progress: 0 };
    let drawn = -1;

    const render = () => {
      const progress = state.progress;
      if (progress === drawn) return;
      drawn = progress;

      if (progress >= 1) {
        target.style.filter = '';
        target.style.visibility = 'inherit';
        return;
      }

      const front = progress * (1 + 2 * cfg.edge) - cfg.edge;
      curve.setAttribute(
        'tableValues',
        LEVELS.map(lvl => (floor + (1 - floor) * (1 - smoothstep(front - cfg.edge, front + cfg.edge, lvl))).toFixed(3)).join(' ')
      );
      target.style.filter = blurFrom > 0 ? `${url} blur(${(blurFrom * (1 - progress)).toFixed(2)}px)` : url;
      target.style.visibility = progress <= 0 && floor <= 0 ? 'hidden' : 'inherit';
    };

    render();

    return {
      state,
      render,
      remove: () => {
        if (svg && svg.parentNode) svg.parentNode.removeChild(svg);
        target.style.filter = '';
      }
    };
  };

  const getLooks = (effect, blur, initialOpacity) => {
    const soften = amt => `blur(${amt}px)`;
    if (effect === 'focus') {
      return [
        { from: { autoAlpha: initialOpacity }, to: { autoAlpha: 1 }, share: 0.6 },
        { from: { filter: soften(12 + blur), scale: 0.97 }, to: { filter: soften(0), scale: 1 }, share: 1 }
      ];
    }
    if (effect === 'develop') {
      return [
        { from: { autoAlpha: initialOpacity }, to: { autoAlpha: 1 }, share: 0.5 },
        {
          from: { filter: `grayscale(1) contrast(0.55) brightness(1.3) ${soften(blur)}` },
          to: { filter: `grayscale(0) contrast(1) brightness(1) ${soften(0)}` },
          share: 1
        }
      ];
    }
    if (blur > 0) {
      return [
        { from: { autoAlpha: initialOpacity, filter: soften(blur) }, to: { autoAlpha: 1, filter: soften(0) }, share: 1 }
      ];
    }
    return [{ from: { autoAlpha: initialOpacity }, to: { autoAlpha: 1 }, share: 1 }];
  };

  // Helper to parse settings for a specific element:
  // Precedence: HTML data attribute > inline data-fade-content value > passed globalDefaults > DEFAULT_SETTINGS
  const parseElementConfig = el => {
    const mergedDefaults = {
      ...DEFAULT_SETTINGS,
      ...globalDefaults
    };

    // Check if data-fade-content itself contains shorthand effect or JSON
    const mainAttr = el.getAttribute('data-fade-content');
    let inlineOptions = {};
    if (mainAttr && mainAttr.trim() !== '' && mainAttr !== 'true') {
      const trimmed = mainAttr.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          inlineOptions = JSON.parse(trimmed);
        } catch (e) {
          console.warn('[FadeContent] Could not parse JSON from data-fade-content:', trimmed);
        }
      } else {
        // Shorthand for effect, e.g. data-fade-content="mist"
        inlineOptions = { effect: trimmed };
      }
    }

    const ds = el.dataset;

    // Retrieve value from user-defined attributes if present, otherwise default
    const getVal = (dsKey, optKey) => {
      // 1. Explicit dataset property (e.g. data-duration -> ds.duration)
      if (ds[dsKey] !== undefined) return ds[dsKey];
      // 2. Kebab-case attribute check (e.g. data-stagger-from)
      const kebab = 'data-' + optKey.replace(/([A-Z])/g, '-$1').toLowerCase();
      if (el.hasAttribute(kebab)) return el.getAttribute(kebab);
      // 3. Lowercase attribute check
      const lower = 'data-' + optKey.toLowerCase();
      if (el.hasAttribute(lower)) return el.getAttribute(lower);
      // 4. Inline options from data-fade-content value
      if (inlineOptions[optKey] !== undefined) return inlineOptions[optKey];
      // 5. Default setting
      return mergedDefaults[optKey];
    };

    const getBool = (dsKey, optKey) => {
      const val = getVal(dsKey, optKey);
      if (typeof val === 'boolean') return val;
      if (val === 'true' || val === '') return true;
      if (val === 'false') return false;
      return Boolean(val);
    };

    const effect = String(getVal('effect', 'effect') || 'fade');
    const containerSelector = getVal('container', 'container') || null;
    const duration = toSeconds(getVal('duration', 'duration')) || mergedDefaults.duration;
    const ease = String(getVal('ease', 'ease') || 'power2.out');
    const delay = toSeconds(getVal('delay', 'delay'));
    const threshold = parseFloat(getVal('threshold', 'threshold')) || 0;
    const initialOpacity = clamp01(parseFloat(getVal('initialOpacity', 'initialOpacity')) || 0);
    const stagger = toSeconds(getVal('stagger', 'stagger'));
    const staggerFrom = String(getVal('staggerFrom', 'staggerFrom') || 'start');
    const trigger = String(getVal('trigger', 'trigger') || 'scroll');
    const once = getBool('once', 'once');
    const exit = getBool('exit', 'exit');
    const pin = getBool('pin', 'pin');
    const markers = getBool('markers', 'markers');

    const scrubVal = getVal('scrub', 'scrub');
    let isScrub = false;
    if (scrubVal === 'true' || scrubVal === '' || scrubVal === true) {
      isScrub = 1;
    } else if (scrubVal === 'false' || scrubVal === false || scrubVal === null || scrubVal === undefined) {
      isScrub = false;
    } else {
      isScrub = parseFloat(scrubVal) || true;
    }

    const disappearAfter = toSeconds(getVal('disappearAfter', 'disappearAfter'));
    const disappearDuration = toSeconds(getVal('disappearDuration', 'disappearDuration')) || mergedDefaults.disappearDuration;
    const disappearEase = String(getVal('disappearEase', 'disappearEase') || 'power2.in');

    const blurRaw = getVal('blur', 'blur');
    const blurAmount = blurRaw === 'true' || blurRaw === true ? 10 : Math.max(parseFloat(blurRaw) || 0, 0);

    const startPos = getVal('start', 'start');
    const endPos = getVal('end', 'end');
    const toggleActions = getVal('toggleActions', 'toggleActions');

    return {
      effect,
      containerSelector,
      duration,
      ease,
      delay,
      threshold,
      initialOpacity,
      stagger,
      staggerFrom,
      trigger,
      once,
      exit,
      pin,
      markers,
      isScrub,
      disappearAfter,
      disappearDuration,
      disappearEase,
      blurAmount,
      startPos,
      endPos,
      toggleActions
    };
  };

  const mm = gsap.matchMedia();

  // Reduced motion preference: reveal instantly
  mm.add('(prefers-reduced-motion: reduce)', () => {
    const elements = typeof selector === 'string' ? document.querySelectorAll(selector) : [selector];
    elements.forEach(el => gsap.set(el, { visibility: 'visible', opacity: 1 }));
  });

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const elements = typeof selector === 'string' ? document.querySelectorAll(selector) : [selector];

    elements.forEach(el => {
      // Clean up previous instance if already initialized on this element
      if (el._fadeContentTimeline) {
        if (el._fadeContentTimeline.scrollTrigger) {
          el._fadeContentTimeline.scrollTrigger.kill();
        }
        el._fadeContentTimeline.kill();
      }

      const cfg = parseElementConfig(el);

      const scroller = cfg.containerSelector ? document.querySelector(cfg.containerSelector) : undefined;
      const targets = cfg.stagger > 0 && el.children.length ? Array.from(el.children) : [el];

      gsap.set(el, { visibility: 'visible' });

      let masks = [];
      const staggerVars = cfg.stagger > 0 ? { stagger: { each: cfg.stagger, from: cfg.staggerFrom } } : {};
      const noisy = NOISE_EFFECTS.includes(cfg.effect);
      const looks = noisy ? [] : getLooks(cfg.effect, cfg.blurAmount, cfg.initialOpacity);

      if (noisy) {
        masks = targets.map(t => createNoiseMask(t, cfg.effect, cfg.initialOpacity, cfg.blurAmount));
      }

      const proxies = masks.map(m => m.state);
      const draw = () => masks.forEach(m => m.render());

      const settle = () => {
        if (noisy) {
          masks.forEach(m => m.remove());
          masks = [];
        } else {
          gsap.set(targets, { clearProps: 'filter,transform' });
        }
      };

      const startPos = cfg.startPos || `top ${Math.round((1 - cfg.threshold) * 100)}%`;
      const endPos = cfg.endPos || (cfg.exit ? `bottom ${Math.round(cfg.threshold * 100)}%` : 'bottom top');

      let toggleActions = cfg.toggleActions;
      if (!toggleActions) {
        if (cfg.once) {
          toggleActions = 'play none none none';
        } else if (cfg.exit) {
          toggleActions = 'play reverse play reverse';
        } else {
          toggleActions = 'play none none reverse';
        }
      }

      const scrollTriggerConfig = cfg.trigger === 'mount' ? undefined : {
        trigger: el,
        scroller: scroller,
        start: startPos,
        end: endPos,
        scrub: cfg.isScrub,
        pin: cfg.pin,
        markers: cfg.markers,
        toggleActions: cfg.isScrub ? undefined : toggleActions,
        invalidateOnRefresh: true,
        fastScrollEnd: true,
        onLeave: () => {
          if (!cfg.exit && cfg.once && !noisy) settle();
        }
      };

      const tl = gsap.timeline({
        scrollTrigger: scrollTriggerConfig,
        onComplete: () => {
          if (!cfg.exit && cfg.once && !cfg.isScrub) settle();
        }
      });

      el._fadeContentTimeline = tl;

      if (noisy) {
        tl.fromTo(
          proxies,
          { progress: 0 },
          {
            progress: 1,
            duration: cfg.isScrub ? 1 : cfg.duration,
            ease: cfg.isScrub ? 'none' : cfg.ease,
            stagger: cfg.stagger > 0 ? { each: cfg.stagger, from: cfg.staggerFrom } : undefined,
            onUpdate: draw
          },
          cfg.delay
        );
      } else {
        looks.forEach(look => {
          tl.fromTo(
            targets,
            look.from,
            {
              ...look.to,
              duration: (cfg.isScrub ? 1 : cfg.duration) * look.share,
              ease: cfg.isScrub ? 'none' : cfg.ease,
              ...staggerVars
            },
            cfg.delay
          );
        });
      }

      if (cfg.disappearAfter > 0 && !cfg.isScrub && !cfg.exit) {
        if (noisy) {
          tl.to(
            proxies,
            {
              progress: 0,
              duration: cfg.disappearDuration,
              ease: cfg.disappearEase,
              stagger: cfg.stagger > 0 ? { each: cfg.stagger, from: cfg.staggerFrom } : undefined,
              onUpdate: draw
            },
            `+=${cfg.disappearAfter}`
          );
        } else {
          looks.forEach(look => {
            tl.to(
              targets,
              {
                ...look.from,
                duration: cfg.disappearDuration,
                ease: cfg.disappearEase,
                ...staggerVars
              },
              `+=${cfg.disappearAfter}`
            );
          });
        }
      }

      if (cfg.trigger === 'mount') {
        tl.play();
      }
    });

    ScrollTrigger.refresh();
  });

  return mm;
}

// Global window exposure
if (typeof window !== 'undefined') {
  window.FadeContent = initFadeContent;
  window.initFadeContent = initFadeContent;
}

// Auto-run on DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initFadeContent('[data-fade-content]'));
  } else {
    initFadeContent('[data-fade-content]');
  }
}

// Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = initFadeContent;
}
/*--anim4--*/
function initFadeIn(target = '[data-fade-in]', globalOptions = {}) {
  const DEFAULT_SETTINGS = {
    mode: 'both',
    delay: 0,
    duration: 0.8,
    offset: 40,
    direction: 'up',
    ease: 'power2.out',
    start: 'top 85%',
    once: true,
    stagger: 0
  };

  const config = Object.assign({}, DEFAULT_SETTINGS, globalOptions);

  if (typeof gsap === 'undefined') {
    console.warn('[initFadeIn] GSAP is required but not loaded.');
    return null;
  }

  if (typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }

  let elements;
  if (typeof target === 'string') {
    elements = document.querySelectorAll(target);
  } else if (target instanceof Element) {
    elements = [target];
  } else if (target && (target instanceof NodeList || Array.isArray(target))) {
    elements = Array.from(target);
  } else {
    elements = document.querySelectorAll('[data-fade-in]');
  }

  if (!elements || elements.length === 0) return null;

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const getNumberAttr = (el, attrNames, fallback) => {
    for (const name of attrNames) {
      if (el.hasAttribute(name)) {
        const val = parseFloat(el.getAttribute(name));
        if (!isNaN(val)) return val;
      }
    }
    return fallback;
  };

  const getStringAttr = (el, attrNames, fallback) => {
    for (const name of attrNames) {
      if (el.hasAttribute(name)) {
        const val = el.getAttribute(name);
        if (val && val.trim() !== '') return val.trim().toLowerCase();
      }
    }
    return fallback;
  };

  const getBoolAttr = (el, attrNames, fallback) => {
    for (const name of attrNames) {
      if (el.hasAttribute(name)) {
        const val = el.getAttribute(name).toLowerCase();
        return val === 'true' || val === '1' || val === '';
      }
    }
    return fallback;
  };

  const ctx = gsap.context(() => {
    elements.forEach((el) => {
      if (el.dataset.fadeInInit === 'true') return;
      el.dataset.fadeInInit = 'true';

      let mode = getStringAttr(
        el,
        ['data-mode', 'data-fade-mode', 'data-type', 'data-fade-type'],
        config.mode
      );

      const disableTransform =
        el.getAttribute('data-transform') === 'false' ||
        getBoolAttr(el, ['data-only-opacity', 'data-fade-only-opacity'], false);

      if (disableTransform) {
        mode = 'opacity';
      }

      const delay = getNumberAttr(el, ['data-delay', 'data-fade-delay'], config.delay);
      const duration = getNumberAttr(
        el,
        ['data-duration', 'data-fade-duration', 'data-time', 'data-fade-time'],
        config.duration
      );
      const rawOffset = getNumberAttr(
        el,
        ['data-offset', 'data-fade-offset', 'data-distance', 'data-fade-distance'],
        config.offset
      );
      const direction = getStringAttr(el, ['data-direction', 'data-fade-direction'], config.direction);
      const ease = getStringAttr(el, ['data-ease', 'data-fade-ease'], config.ease);

      if (direction === 'none') {
        mode = 'opacity';
      }

      const start = getStringAttr(el, ['data-start', 'data-fade-start'], config.start);
      const once = getBoolAttr(el, ['data-once', 'data-fade-once'], config.once);
      const stagger = getNumberAttr(el, ['data-stagger', 'data-fade-stagger'], config.stagger);

      const isOpacityActive = mode === 'both' || mode === 'opacity';
      const isTransformActive =
        mode === 'both' &&
        !prefersReducedMotion &&
        direction !== 'none';

      let x = 0;
      let y = 0;
      if (isTransformActive) {
        const offset = rawOffset;
        if (direction === 'up') y = offset;
        else if (direction === 'down') y = -offset;
        else if (direction === 'left') x = offset;
        else if (direction === 'right') x = -offset;
      }

      const animationTargets = (stagger > 0 && el.children.length > 0)
        ? Array.from(el.children)
        : el;

      const fromVars = {};
      const toVars = {
        duration: prefersReducedMotion ? 0.01 : duration,
        delay: delay,
        ease: ease,
        clearProps: 'willChange',
        scrollTrigger: {
          trigger: el,
          start: start,
          toggleActions: once ? 'play none none none' : 'play reverse play reverse',
          fastScrollEnd: true,
          preventOverlaps: true
        }
      };

      if (stagger > 0) {
        toVars.stagger = stagger;
      }

      if (isOpacityActive && isTransformActive) {
        fromVars.opacity = 0;
        fromVars.x = x;
        fromVars.y = y;
        fromVars.willChange = 'opacity, transform';
        toVars.opacity = 1;
        toVars.x = 0;
        toVars.y = 0;
      } else if (isOpacityActive) {
        fromVars.opacity = 0;
        fromVars.willChange = 'opacity';
        toVars.opacity = 1;
      } else if (isTransformActive) {
        fromVars.x = x;
        fromVars.y = y;
        fromVars.willChange = 'transform';
        toVars.x = 0;
        toVars.y = 0;
      }

      gsap.fromTo(animationTargets, fromVars, toVars);
    });
  });

  return ctx;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initFadeIn('[data-fade-in]'));
  } else {
    initFadeIn('[data-fade-in]');
  }
}

if (typeof window !== 'undefined') {
  window.initFadeIn = initFadeIn;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = initFadeIn;
}
