function AnimatedList(target = '[data-animated-list], [data-animated-item]', options = {}) {
  const gsap = window.gsap;
  if (!gsap) return [];

  if (window.ScrollTrigger) {
    gsap.registerPlugin(window.ScrollTrigger);
  }

  const opts = {
    stagger: 0.04,
    duration: 0.55,
    ease: 'back.out(1.4)',
    scale: 0.8,
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