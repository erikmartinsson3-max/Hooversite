(function () {
  'use strict';

  /* ── CONFIG ── */
  const BLOCKS     = 28;
  const SKIP_SEC   = 10;
  const TICK_COUNT = 5;

  /* ── ELEMENTS ── */
  const grid          = document.getElementById('mediaGrid');
  const filterNav     = document.getElementById('filterNav');
  const playerScreen  = document.getElementById('playerScreen');
  const progBlocks    = document.getElementById('progBlocks');
  const progTicks     = document.getElementById('progTicks');
  const progressTrack = document.getElementById('progressTrack');
  const timeDisplay   = document.getElementById('timeDisplay');
  const volDisplay    = document.getElementById('volDisplay');
  const progEnd       = document.getElementById('progEnd');
  const metaFilename  = document.getElementById('metaFilename');
  const metaInfo      = document.getElementById('metaInfo');
  const tagRow        = document.getElementById('tagRow');
  const btnPlay       = document.getElementById('btnPlay');
  const btnRew        = document.getElementById('btnRew');
  const btnFwd        = document.getElementById('btnFwd');
  const btnFs         = document.getElementById('btnFs');
  const lightbox      = document.getElementById('lightbox');
  const lightboxPlayer = document.getElementById('lightboxPlayer');
  const lightboxPhoto  = document.getElementById('lightboxPhoto');
  const photoImg       = document.getElementById('photoImg');

  /* ── BUILD PROGRESS BLOCKS ── */
  for (let i = 0; i < BLOCKS; i++) {
    const b = document.createElement('div');
    b.className = 'prog-block';
    progBlocks.appendChild(b);
  }
  for (let i = 0; i < TICK_COUNT; i++) {
    const t = document.createElement('span');
    t.className = 'prog-tick';
    progTicks.appendChild(t);
  }

  /* ── PLYR INIT ── */
  const plyr = new Plyr('#player', {
    controls: [],
    keyboard: { focused: true, global: false },
    tooltips: { controls: false, seek: false },
  });

  /* ── STATE ── */
  let isPhotoMode = false;
  let volume      = 1.0;
  let muted       = false;

  /* ── HELPERS ── */
  function fmt(sec) {
    if (!isFinite(sec) || isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function updateProgress() {
    if (isPhotoMode) return;
    const dur  = plyr.duration    || 0;
    const cur  = plyr.currentTime || 0;
    const pct  = dur > 0 ? cur / dur : 0;
    const fill = Math.round(pct * BLOCKS);

    document.querySelectorAll('.prog-block').forEach((b, i) => {
      b.classList.toggle('filled', i < fill);
    });

    timeDisplay.innerHTML = fmt(cur) + ' / ' + fmt(dur) + '<span class="blink">_</span>';
    progEnd.textContent   = fmt(dur);

    const ticks = document.querySelectorAll('.prog-tick');
    ticks.forEach((t, i) => {
      const ratio = i / (ticks.length - 1);
      t.textContent = (i === 0 || i === ticks.length - 1) ? '' : fmt(ratio * dur);
    });
  }

  function updatePlayBtn() {
    btnPlay.innerHTML = plyr.playing ? '&#x23F8;' : '&#x25B6;';
    btnPlay.setAttribute('aria-label', plyr.playing ? 'Pause' : 'Play');
  }

  function updateVol() {
    const pct = muted ? 0 : Math.round(volume * 100);
    volDisplay.textContent = 'VOL:' + String(pct).padStart(3, '0');
  }

  function setMeta(data) {
    metaFilename.textContent = data.label || '';
    metaInfo.textContent     = data.info  || '';
    const tags = (data.tags || '').split(',').filter(Boolean);
    tagRow.innerHTML = tags.map(t => `<span class="tag">${t.trim()}</span>`).join('');
  }

  /* ── LIGHTBOX OPEN / CLOSE ── */
  function openLightbox() {
    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // prevent background scroll
  }

  function closeLightbox() {
    lightbox.style.display = 'none';
    document.body.style.overflow = '';
    plyr.pause();
    document.querySelectorAll('.media-thumb').forEach(t => t.classList.remove('active'));
  }

  document.getElementById('lightboxBackdrop').addEventListener('click', closeLightbox);
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLightbox();
  });

  /* ── SWITCH TO VIDEO ── */
  function loadVideo(thumb) {
    isPhotoMode = false;
    lightboxPlayer.style.display = '';
    lightboxPhoto.style.display  = 'none';

    plyr.pause();
    plyr.source = {
      type: 'video',
      sources: [{ src: thumb.dataset.src, type: 'video/mp4' }],
    };
    plyr.once('loadedmetadata', () => updateProgress());
    setMeta(thumb.dataset);
    updatePlayBtn();
    openLightbox();
  }

  /* ── SWITCH TO PHOTO ── */
  function loadPhoto(thumb) {
    isPhotoMode = true;
    plyr.pause();
    lightboxPlayer.style.display = 'none';
    lightboxPhoto.style.display  = '';
    photoImg.src = thumb.dataset.src;
    photoImg.alt = thumb.dataset.label || '';
    setMeta(thumb.dataset);
    openLightbox();
  }

  /* ── BUILD THUMBNAIL ── */
  function buildThumb(item) {
    const div = document.createElement('div');
    div.className     = 'media-thumb';
    div.style.display = 'none';
    div.dataset.type  = item.type;
    div.dataset.src   = item.src;
    div.dataset.label = item.label || item.src.split('/').pop();
    div.dataset.info  = item.info  || '';
    div.dataset.tags  = item.tags  || '';
    div.dataset.tab   = item.tab   || '';

    const badge = document.createElement('span');
    badge.className   = 'thumb-type';
    badge.textContent = item.type;
    div.appendChild(badge);

    if (item.thumbnail) {
      const img = document.createElement('img');
      img.src = item.thumbnail;
      img.alt = div.dataset.label;
      div.appendChild(img);
    }

    const inner = document.createElement('div');
    inner.className = 'thumb-inner';
    inner.innerHTML = `
      <span class="thumb-ascii">${item.type === 'vid' ? '&#x25B6;' : '&#x25A0;'}</span>
      <span class="thumb-label">${div.dataset.label}</span>
    `;
    div.appendChild(inner);

    return div;
  }

  /* ── BUILD TABS ── */
  function buildTabs(items) {
    const seen = [];
    items.forEach(item => {
      const tab = item.tab;
      if (tab && !seen.includes(tab)) seen.push(tab);
    });

    filterNav.innerHTML = '';
    seen.forEach((tabName, i) => {
      const li = document.createElement('li');
      li.textContent = tabName;
      li.dataset.tab = tabName;
      if (i === 0) li.classList.add('active');
      filterNav.appendChild(li);
    });
  }

  /* ── FILTER BY TAB ── */
  function filterByTab(tabName) {
    closeLightbox();
    document.querySelectorAll('.media-thumb').forEach(thumb => {
      thumb.style.display = thumb.dataset.tab === tabName ? '' : 'none';
      thumb.classList.remove('active');
    });
  }

  /* ── LOAD FROM media.json ── */
  fetch('media.json')
    .then(res => {
      if (!res.ok) throw new Error('media.json not found');
      return res.json();
    })
    .then(data => {
      grid.innerHTML = '';

      if (!data.items || data.items.length === 0) {
        grid.innerHTML = '<p style="color:var(--muted);font-size:11px;padding:1rem;">no media — add items to media.json</p>';
        return;
      }

      buildTabs(data.items);

      data.items.forEach(item => {
        grid.appendChild(buildThumb(item));
      });

      // Show items for first tab by default
      const firstTab = filterNav.querySelector('li');
      if (firstTab) filterByTab(firstTab.dataset.tab);
    })
    .catch(err => {
      console.error('Could not load media.json:', err);
      grid.innerHTML = '<p style="color:var(--rec);font-size:11px;padding:1rem;">error: could not load media.json</p>';
    });

  /* ── THUMBNAIL CLICK ── */
  grid.addEventListener('click', function (e) {
    const thumb = e.target.closest('.media-thumb');
    if (!thumb) return;
    document.querySelectorAll('.media-thumb').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
    thumb.dataset.type === 'vid' ? loadVideo(thumb) : loadPhoto(thumb);
  });

  /* ── TAB CLICK ── */
  filterNav.addEventListener('click', function (e) {
    const li = e.target.closest('li');
    if (!li) return;
    document.querySelectorAll('#filterNav li').forEach(l => l.classList.remove('active'));
    li.classList.add('active');
    filterByTab(li.dataset.tab);
  });

  /* ── CONTROLS ── */
  btnPlay.addEventListener('click', function () {
    if (isPhotoMode) return;
    plyr.togglePlay();
  });

  btnRew.addEventListener('click', function () {
    if (isPhotoMode) return;
    plyr.currentTime = Math.max(0, plyr.currentTime - SKIP_SEC);
  });

  btnFwd.addEventListener('click', function () {
    if (isPhotoMode) return;
    plyr.currentTime = Math.min(plyr.duration || 0, plyr.currentTime + SKIP_SEC);
  });

  volDisplay.addEventListener('click', function () {
    muted = !muted;
    plyr.muted = muted;
    updateVol();
  });

  btnFs.addEventListener('click', function () {
    plyr.fullscreen.toggle();
  });

  progressTrack.addEventListener('click', function (e) {
    if (isPhotoMode || !plyr.duration) return;
    const rect = progressTrack.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    plyr.currentTime = Math.max(0, Math.min(plyr.duration, pct * plyr.duration));
  });

  /* ── PLYR EVENTS ── */
  plyr.on('timeupdate',     updateProgress);
  plyr.on('loadedmetadata', updateProgress);
  plyr.on('play',           updatePlayBtn);
  plyr.on('pause',          updatePlayBtn);
  plyr.on('ended',          updatePlayBtn);
  plyr.on('volumechange',   function () {
    volume = plyr.volume;
    muted  = plyr.muted;
    updateVol();
  });

  /* ── INIT ── */
  updateVol();
  updateProgress();

})();
/* intentional no-op — CSS is separate */