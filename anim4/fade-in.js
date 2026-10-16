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
