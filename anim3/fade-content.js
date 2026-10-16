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
