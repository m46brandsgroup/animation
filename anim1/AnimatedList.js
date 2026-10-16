function AnimatedList(target = '[data-animated-list]', options = {}) {
  if (target && typeof target === 'object' && !(target instanceof HTMLElement)) {
    options = target;
    target = '[data-animated-list]';
  }

  if (typeof target === 'string') {
    const selector = target.startsWith('#') || target.startsWith('.') || target.startsWith('[') || target.includes(' ')
      ? target
      : `[${target}]`;
    const elements = document.querySelectorAll(selector);
    if (elements.length > 1) {
      return Array.from(elements).map(el => AnimatedList(el, options));
    }
    target = elements[0];
  }

  if (!target) return null;

  const gsap = window.gsap;
  const opts = {
    onItemSelect: null,
    initialSelectedIndex: -1,
    selectOnHover: true,
    enableArrowNavigation: true,
    loop: false,
    stagger: 0.04,
    showGradients: true,
    fadeSize: 56,
    ...options
  };

  let selected = opts.initialSelectedIndex;
  let keyboardNav = false;
  let navigating = false;
  let pointer = [0, 0];

  // 1. Collect static child items
  const staticItems = Array.from(target.querySelectorAll('.animated-list__item, [data-item]'));
  const rawItems = staticItems.length ? staticItems : Array.from(target.children);

  // 2. Build DOM layout
  const root = document.createElement('div');
  root.className = 'animated-list animated-list--framed';

  const viewport = document.createElement('div');
  viewport.className = 'animated-list__viewport';
  viewport.setAttribute('role', 'listbox');
  viewport.tabIndex = 0;

  const track = document.createElement('div');
  track.className = 'animated-list__track';

  const indicator = document.createElement('span');
  indicator.className = 'animated-list__indicator';
  indicator.setAttribute('aria-hidden', 'true');

  const ring = document.createElement('span');
  ring.className = 'animated-list__ring';
  indicator.appendChild(ring);
  track.appendChild(indicator);

  const frameRim = document.createElement('span');
  frameRim.className = 'animated-list__frame-rim';
  frameRim.setAttribute('aria-hidden', 'true');
  root.appendChild(frameRim);

  viewport.appendChild(track);
  root.appendChild(viewport);

  // Mount items into track
  const items = rawItems.map((el, index) => {
    el.classList.add('animated-list__item');
    el.setAttribute('role', 'option');
    el.dataset.index = index;

    if (!el.querySelector('.animated-list__rim')) {
      const rim = document.createElement('span');
      rim.className = 'animated-list__rim';
      rim.setAttribute('aria-hidden', 'true');
      el.appendChild(rim);
    }

    if (opts.selectOnHover) {
      el.addEventListener('pointerenter', () => {
        if (!navigating) select(index);
      });
    }

    el.addEventListener('click', () => {
      select(index);
      opts.onItemSelect?.(el, index);
    });

    track.insertBefore(el, indicator);
    return el;
  });

  target.innerHTML = '';
  target.appendChild(root);

  // 3. Dimensions and gradient masks
  function syncDimensions() {
    const computed = window.getComputedStyle ? window.getComputedStyle(target) : null;
    root.style.width = '100%';
    root.style.height = '100%';
    viewport.style.height = '100%';
    if (target.style.maxHeight) viewport.style.maxHeight = target.style.maxHeight;
  }

  function updateFades() {
    if (!opts.showGradients) return;
    const span = Math.max(1, opts.fadeSize);
    const top = Math.min(span, Math.max(0, viewport.scrollTop));
    const bottom = Math.min(span, Math.max(0, viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop));
    viewport.style.setProperty('--al-fade-top', `${top.toFixed(1)}px`);
    viewport.style.setProperty('--al-fade-bottom', `${bottom.toFixed(1)}px`);
  }

  // Smooth mask gradient
  if (opts.showGradients) {
    const steps = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1];
    const topGrad = steps.map(t => `rgba(0,0,0,${(t * t * (3 - 2 * t)).toFixed(3)}) calc(var(--al-fade-top, 0px) * ${t})`);
    const botGrad = [...steps].reverse().map(t => `rgba(0,0,0,${(t * t * (3 - 2 * t)).toFixed(3)}) calc(100% - var(--al-fade-bottom, 0px) * ${t})`);
    const mask = `linear-gradient(to bottom, ${[...topGrad, ...botGrad].join(', ')})`;
    viewport.style.maskImage = mask;
    viewport.style.webkitMaskImage = mask;
  }

  // 4. Gliding Indicator Animation
  function place(snap = false) {
    const item = items[selected];
    if (!item || item._scrollState !== 'in') {
      if (gsap) gsap.to(indicator, { opacity: 0, duration: 0.2, overwrite: 'auto' });
      else indicator.style.opacity = '0';
      return;
    }

    if (gsap) {
      if (snap) {
        gsap.set(indicator, { y: item.offsetTop, height: item.offsetHeight, opacity: 1 });
      } else {
        gsap.to(indicator, {
          y: item.offsetTop,
          height: item.offsetHeight,
          opacity: 1,
          duration: 0.38,
          ease: 'power3.out',
          overwrite: 'auto'
        });
      }
    } else {
      indicator.style.transform = `translate3d(0, ${item.offsetTop}px, 0)`;
      indicator.style.height = `${item.offsetHeight}px`;
      indicator.style.opacity = '1';
    }
  }

  // 5. On-Scroll Scaling Animation
  function updateScrollScaling(entrance = false) {
    if (!gsap) return;
    const top = viewport.scrollTop;
    const viewH = viewport.clientHeight;
    let order = 0;

    items.forEach(item => {
      const itemTop = item.offsetTop;
      const itemH = item.offsetHeight;
      const start = itemTop - top;
      const overlap = Math.min(viewH, start + itemH) - Math.max(0, start);
      const hidden = overlap < Math.min(itemH, viewH) * 0.4;
      const state = hidden ? (start + itemH / 2 < viewH / 2 ? 'above' : 'below') : 'in';

      if (item._scrollState === state) return;
      item._scrollState = state;

      if (state === 'in') {
        const delay = entrance ? (order++ * Math.max(0, opts.stagger)) : 0;
        gsap.to(item, {
          scale: 1,
          y: 0,
          opacity: 1,
          duration: 0.55,
          delay,
          ease: 'back.out(1.4)',
          overwrite: 'auto'
        });
      } else {
        gsap.to(item, {
          scale: 0.8,
          y: state === 'above' ? -14 : 14,
          opacity: 0,
          duration: 0.35,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }
    });

    place(false);
  }

  // 6. Item Selection
  function select(index) {
    if (index === selected) return;
    selected = index;

    items.forEach((el, idx) => {
      const isSel = idx === index;
      el.setAttribute('aria-selected', isSel ? 'true' : 'false');
      if (isSel) el.dataset.selected = '';
      else delete el.dataset.selected;
    });

    place(false);

    if (keyboardNav) {
      keyboardNav = false;
      items[index]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  // 7. Event Handlers
  const onScroll = () => {
    updateFades();
    updateScrollScaling(false);
  };

  const onKey = event => {
    if (!opts.enableArrowNavigation || event.defaultPrevented) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const active = document.activeElement;
    const focused = active === viewport;
    const idle = !active || active === document.body || active === document.documentElement;
    if (!focused && !idle) return;

    const count = items.length;
    if (!count) return;
    let next = null;

    if (event.key === 'ArrowDown') next = selected < 0 ? 0 : selected + 1;
    else if (event.key === 'ArrowUp') next = selected < 0 ? count - 1 : selected - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = count - 1;
    else if ((event.key === 'Enter' || (focused && event.key === ' ')) && selected >= 0 && selected < count) {
      event.preventDefault();
      opts.onItemSelect?.(items[selected], selected);
      return;
    }

    if (next === null) return;
    event.preventDefault();

    next = opts.loop ? (next + count) % count : Math.min(count - 1, Math.max(0, next));
    keyboardNav = true;
    navigating = true;
    select(next);
  };

  const onPointerMove = event => {
    const moved = event.clientX !== pointer[0] || event.clientY !== pointer[1];
    pointer = [event.clientX, event.clientY];
    if (!navigating || !moved) return;
    navigating = false;
    const item = event.target instanceof Element ? event.target.closest('[data-index]') : null;
    if (item && root.contains(item) && opts.selectOnHover) {
      select(Number(item.dataset.index));
    }
  };

  viewport.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('keydown', onKey);
  root.addEventListener('pointermove', onPointerMove);

  let resizeObserver = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      syncDimensions();
      place(true);
      updateFades();
      updateScrollScaling(false);
    });
    resizeObserver.observe(target);
    resizeObserver.observe(viewport);
    resizeObserver.observe(track);
  }

  // 8. Initialization
  syncDimensions();
  updateFades();

  if (gsap) {
    items.forEach(item => {
      gsap.set(item, { scale: 0.8, y: 14, opacity: 0 });
      item._scrollState = 'below';
    });
  }

  updateScrollScaling(true);
  place(true);

  // 9. Return controller for programmatic control
  const controller = {
    select,
    getSelected: () => ({ index: selected, item: items[selected] || null }),
    items,
    destroy: () => {
      if (gsap) gsap.killTweensOf([indicator, ...items]);
      resizeObserver?.disconnect();
      viewport.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKey);
      root.removeEventListener('pointermove', onPointerMove);
      root.remove();
    }
  };

  return controller;
}

// Global and module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnimatedList;
} else if (typeof define === 'function' && define.amd) {
  define([], () => AnimatedList);
} else {
  window.AnimatedList = AnimatedList;
}

 new AnimatedList();