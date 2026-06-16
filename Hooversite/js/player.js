(function () {
  'use strict';

  /* ── CONFIG ── */
  const BLOCKS     = 28;
  const SKIP_SEC   = 10;
  const TICK_COUNT = 5;

  /* ── ELEMENTS ── */
  const grid          = document.getElementById('mediaGrid');
  const filterNav     = document.getElementById('filterNav');
  const modal          = document.getElementById('myModal');
  const modalClose     = document.getElementById('modalClose');
  const modalPrev      = document.getElementById('modalPrev');
  const modalNext      = document.getElementById('modalNext');
  const playerArea    = document.getElementById('playerArea');
  const playerScreen  = document.getElementById('playerScreen');
  const photoDisplay  = document.getElementById('photoDisplay');
  const photoImg      = document.getElementById('photoImg');
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
  let mediaItems  = [];   // full list, straight from media.json
  let currentList = [];   // items in the active tab (what prev/next walks through)
  let currentIndex = -1;  // position of the open item inside currentList
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

  function setMeta(item) {
    metaFilename.textContent = item.label || item.src.split('/').pop();
    metaInfo.textContent     = item.info  || '';
    const tags = (item.tags || '').split(',').filter(Boolean);
    tagRow.innerHTML = tags.map(t => `<span class="tag">${t.trim()}</span>`).join('');
  }

  /* ── BUILD THUMBNAIL ELEMENT ── */
  function buildThumb(item, index) {
    const div = document.createElement('div');
    div.className     = 'media-thumb';
    div.style.display = 'none'; // hidden until the matching tab is active
    div.dataset.index = index;  // points back into mediaItems
    div.dataset.tab    = item.tab || 'all';

    const label = item.label || item.src.split('/').pop();

    const badge = document.createElement('span');
    badge.className   = 'thumb-type';
    badge.textContent = item.type;
    div.appendChild(badge);

    if (item.thumbnail) {
      const img = document.createElement('img');
      img.src = item.thumbnail;
      img.alt = label;
      div.appendChild(img);
    }

    const inner = document.createElement('div');
    inner.className = 'thumb-inner';
    inner.innerHTML = `
      <span class="thumb-ascii">${item.type === 'vid' ? '&#x25B6;' : '&#x25A0;'}</span>
      <span class="thumb-label">${label}</span>
    `;
    div.appendChild(inner);

    return div;
  }

  /* ── BUILD TABS FROM JSON DATA ── */
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

    return seen;
  }

  /* ── FILTER GRID BY TAB ── */
  function filterByTab(tabName) {
    document.querySelectorAll('.media-thumb').forEach(thumb => {
      const match = thumb.dataset.tab === tabName;
      thumb.style.display = match ? '' : 'none';
      thumb.classList.remove('active');
    });
  }

  /* ── LOAD MEDIA FROM JSON ── */
  fetch('media.json')
    .then(res => {
      if (!res.ok) throw new Error('media.json not found');
      return res.json();
    })
    .then(data => {
      grid.innerHTML = '';

      if (!data.items || data.items.length === 0) {
        grid.innerHTML = '<p style="color:var(--muted);font-size:11px;padding:1rem;">no media found — add items to media.json</p>';
        return;
      }

      mediaItems = data.items;

      const tabs = buildTabs(mediaItems);

      mediaItems.forEach((item, index) => {
        const thumb = buildThumb(item, index);
        grid.appendChild(thumb);
      });

      if (tabs.length) filterByTab(tabs[0]);
    })
    .catch(err => {
      console.error('Could not load media.json:', err);
      grid.innerHTML = '<p style="color:var(--rec);font-size:11px;padding:1rem;">error: could not load media.json</p>';
    });

  /* ── SWITCH TO VIDEO ── */
  function loadVideo(item) {
    isPhotoMode = false;
    playerArea.style.display   = '';
    photoDisplay.style.display = 'none';
    plyr.pause();
    plyr.source = {
      type: 'video',
      sources: [{ src: item.src, type: 'video/mp4' }],
    };
    plyr.once('loadedmetadata', () => updateProgress());
    setMeta(item);
    updatePlayBtn();
  }

  /* ── SWITCH TO PHOTO ── */
  function loadPhoto(item) {
    isPhotoMode = true;
    plyr.pause();
    playerArea.style.display   = 'none';
    photoDisplay.style.display = '';
    photoImg.src = item.src;
    photoImg.alt = item.label || '';
    setMeta(item);
  }

  /* ── LOAD WHICHEVER ITEM IS CURRENT ── */
  function loadItem(item) {
    if (!item) return;
    item.type === 'vid' ? loadVideo(item) : loadPhoto(item);
  }

  /* ── MODAL OPEN / CLOSE ── */
  function openModal(item) {
    // prev/next walks the items within this item's own tab
    currentList  = mediaItems.filter(m => m.tab === item.tab);
    currentIndex = currentList.indexOf(item);
    modal.classList.add('open');
    loadItem(item);
  }

  function closeModal() {
    modal.classList.remove('open');
    plyr.pause();
  }

  function showRelative(offset) {
    if (currentList.length === 0) return;
    currentIndex = (currentIndex + offset + currentList.length) % currentList.length;
    loadItem(currentList[currentIndex]);
  }

  /* ── THUMBNAIL CLICK ── */
  grid.addEventListener('click', function (e) {
    const thumb = e.target.closest('.media-thumb');
    if (!thumb) return;
    const item = mediaItems[Number(thumb.dataset.index)];
    if (!item) return;
    openModal(item);
  });

  /* ── TAB CLICK ── */
  filterNav.addEventListener('click', function (e) {
    const li = e.target.closest('li');
    if (!li) return;

    document.querySelectorAll('#filterNav li').forEach(l => l.classList.remove('active'));
    li.classList.add('active');

    filterByTab(li.dataset.tab);
  });

  /* ── MODAL CONTROLS ── */
  modalClose.addEventListener('click', closeModal);
  modalPrev.addEventListener('click', () => showRelative(-1));
  modalNext.addEventListener('click', () => showRelative(1));

  // click on the dark backdrop (not the content) closes it
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape')     closeModal();
    if (e.key === 'ArrowLeft')  showRelative(-1);
    if (e.key === 'ArrowRight') showRelative(1);
  });

  /* ── PLAYER CONTROLS ── */
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
    if (isPhotoMode) {
      if (!document.fullscreenElement) {
        photoDisplay.requestFullscreen && photoDisplay.requestFullscreen();
      } else {
        document.exitFullscreen && document.exitFullscreen();
      }
    } else {
      plyr.fullscreen.toggle();
    }
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