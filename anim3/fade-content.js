function initFadeContent(selector = '[data-fade-content]', globalDefaults = {}) {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return null;

  gsap.registerPlugin(ScrollTrigger);

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const NOISE_EFFECTS = ['dissolve', 'mist', 'pixel'];
  const LEVELS = Array.from({ length: 33 }, (_, i) => 1 / (1 + Math.exp(-10.8 * (i / 32 - 0.5))));
  let maskCount = 0;

  const toSeconds = val => (typeof val === 'number' && val > 10 ? val / 1000 : parseFloat(val) || 0);
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

  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const elements = typeof selector === 'string' ? document.querySelectorAll(selector) : [selector];

    elements.forEach(el => {
      const ds = el.dataset;

      const effect = ds.effect || globalDefaults.effect || 'fade';
      const containerSelector = ds.container || globalDefaults.container || null;
      const duration = toSeconds(ds.duration ?? globalDefaults.duration ?? 1) || 1;
      const ease = ds.ease || globalDefaults.ease || 'power2.out';
      const delay = toSeconds(ds.delay ?? globalDefaults.delay ?? 0);
      const threshold = parseFloat(ds.threshold ?? globalDefaults.threshold ?? '0.1');
      const initialOpacity = clamp01(parseFloat(ds.initialOpacity ?? globalDefaults.initialOpacity ?? '0'));
      const stagger = toSeconds(ds.stagger ?? globalDefaults.stagger ?? 0);
      const staggerFrom = ds.staggerFrom || globalDefaults.staggerFrom || 'start';
      const trigger = ds.trigger || globalDefaults.trigger || 'scroll';
      const once = ds.once !== 'false' && (globalDefaults.once !== false);
      const exit = ds.exit === 'true' || globalDefaults.exit === true;
      const pin = ds.pin === 'true' || globalDefaults.pin === true;
      const markers = ds.markers === 'true' || globalDefaults.markers === true;
      const isScrub = ds.scrub !== undefined ? (ds.scrub === 'true' || ds.scrub === '' ? 1 : parseFloat(ds.scrub) || true) : (globalDefaults.scrub ?? false);
      const disappearAfter = toSeconds(ds.disappearAfter ?? globalDefaults.disappearAfter ?? 0);
      const disappearDuration = toSeconds(ds.disappearDuration ?? globalDefaults.disappearDuration ?? 0.5);
      const disappearEase = ds.disappearEase || globalDefaults.disappearEase || 'power2.in';

      const blurRaw = ds.blur ?? globalDefaults.blur ?? false;
      const blurAmount = blurRaw === 'true' || blurRaw === true ? 10 : Math.max(parseFloat(blurRaw) || 0, 0);

      const scroller = containerSelector ? document.querySelector(containerSelector) : undefined;
      const targets = stagger > 0 && el.children.length ? Array.from(el.children) : [el];

      gsap.set(el, { visibility: 'visible' });

      let masks = [];
      const staggerVars = stagger > 0 ? { stagger: { each: stagger, from: staggerFrom } } : {};
      const noisy = NOISE_EFFECTS.includes(effect);
      const looks = noisy ? [] : getLooks(effect, blurAmount, initialOpacity);

      if (noisy) {
        masks = targets.map(t => createNoiseMask(t, effect, initialOpacity, blurAmount));
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

      const startPos = ds.start || globalDefaults.start || `top ${Math.round((1 - threshold) * 100)}%`;
      const endPos = ds.end || globalDefaults.end || (exit ? `bottom ${Math.round(threshold * 100)}%` : 'bottom top');

      let toggleActions = ds.toggleActions || globalDefaults.toggleActions;
      if (!toggleActions) {
        if (once) {
          toggleActions = 'play none none none';
        } else if (exit) {
          toggleActions = 'play reverse play reverse';
        } else {
          toggleActions = 'play none none reverse';
        }
      }

      const scrollTriggerConfig = trigger === 'mount' ? undefined : {
        trigger: el,
        scroller: scroller,
        start: startPos,
        end: endPos,
        scrub: isScrub,
        pin: pin,
        markers: markers,
        toggleActions: isScrub ? undefined : toggleActions,
        invalidateOnRefresh: true,
        fastScrollEnd: true,
        onLeave: () => {
          if (!exit && once && !noisy) settle();
        }
      };

      const tl = gsap.timeline({
        scrollTrigger: scrollTriggerConfig,
        onComplete: () => {
          if (!exit && once && !isScrub) settle();
        }
      });

      if (noisy) {
        tl.fromTo(
          proxies,
          { progress: 0 },
          {
            progress: 1,
            duration: isScrub ? 1 : duration,
            ease: isScrub ? 'none' : ease,
            stagger: stagger > 0 ? { each: stagger, from: staggerFrom } : undefined,
            onUpdate: draw
          },
          delay
        );
      } else {
        looks.forEach(look => {
          tl.fromTo(
            targets,
            look.from,
            {
              ...look.to,
              duration: (isScrub ? 1 : duration) * look.share,
              ease: isScrub ? 'none' : ease,
              ...staggerVars
            },
            delay
          );
        });
      }

      if (disappearAfter > 0 && !isScrub && !exit) {
        if (noisy) {
          tl.to(
            proxies,
            {
              progress: 0,
              duration: disappearDuration,
              ease: disappearEase,
              stagger: stagger > 0 ? { each: stagger, from: staggerFrom } : undefined,
              onUpdate: draw
            },
            `+=${disappearAfter}`
          );
        } else {
          looks.forEach(look => {
            tl.to(
              targets,
              {
                ...look.from,
                duration: disappearDuration,
                ease: disappearEase,
                ...staggerVars
              },
              `+=${disappearAfter}`
            );
          });
        }
      }

      if (trigger === 'mount') {
        tl.play();
      }
    });

    ScrollTrigger.refresh();
  });

  return mm;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initFadeContent('[data-fade-content]'));
  } else {
    initFadeContent('[data-fade-content]');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = initFadeContent;
}
