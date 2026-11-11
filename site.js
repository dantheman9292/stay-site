(() => {
  'use strict';
  const code = document.body.dataset.code;
  const config = window.STAY_CONFIG || {};
  let pixelLoaded = false;

  function track(method, event) {
    if (pixelLoaded) {
      window.fbq(method, event, {content_name: code});
    }
  }

  if (config.pixelId) {
    // Meta's standard queue bootstrap, loaded only after an ID is configured.
    (function(f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', config.pixelId);
    window.fbq('track', 'PageView');
    window.fbq('track', 'ViewContent', {content_name: code});
    // Booking clicks keep their native navigation, with no added delay.
    const pixelScript = Array.from(document.scripts).find(
      script => script.src === 'https://connect.facebook.net/en_US/fbevents.js'
    );
    if (pixelScript) {
      pixelScript.addEventListener('load', () => { pixelLoaded = true; });
    }
  }

  document.querySelectorAll('[data-book]').forEach(link => {
    link.addEventListener('click', () => track('track', 'InitiateCheckout'));
  });

  const dialog = document.querySelector('.viewer');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const photos = Array.from(document.querySelectorAll('.photo-grid [data-photo]'));
  const image = document.createElement('img');
  image.decoding = 'async';
  image.loading = 'eager';
  document.querySelector('#viewer-image').append(image);
  const count = document.querySelector('#photo-count');
  const caption = document.querySelector('#photo-caption');
  let current = 0;
  let galleryOpened = false;
  let opener = null;
  let pointerStart = null;

  function showPhoto(index) {
    current = (index + photos.length) % photos.length;
    const thumbnail = photos[current].querySelector('img');
    image.src = photos[current].href;
    image.srcset = thumbnail.srcset;
    image.sizes = '100vw';
    image.alt = thumbnail.alt;
    count.textContent = `${current + 1} / ${photos.length}`;
    caption.textContent = thumbnail.alt;
  }

  document.querySelectorAll('[data-photo]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      showPhoto(Number(link.dataset.photo));
      dialog.showModal();
      document.body.classList.add('viewer-open');
      if (!galleryOpened) {
        // Queue this first-open event even while the pixel script is loading.
        if (config.pixelId && window.fbq) {
          window.fbq('trackCustom', 'GalleryOpen', {content_name: code});
        }
        galleryOpened = true;
      }
    });
  });

  document.querySelector('.viewer-close').addEventListener('click', () => dialog.close());
  document.querySelector('.viewer-prev').addEventListener('click', () => showPhoto(current - 1));
  document.querySelector('.viewer-next').addEventListener('click', () => showPhoto(current + 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showPhoto(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('viewer-open');
    if (opener) opener.focus({preventScroll: true});
  });
  const stage = document.querySelector('.viewer-stage');
  stage.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.target.closest('button')) return;
    pointerStart = {x: event.clientX, y: event.clientY, id: event.pointerId};
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointerup', event => {
    if (!pointerStart || event.pointerId !== pointerStart.id) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      showPhoto(current + (dx < 0 ? 1 : -1));
    }
  });
  stage.addEventListener('pointercancel', () => { pointerStart = null; });
  image.addEventListener('dragstart', event => event.preventDefault());
})();
