(function () {
  'use strict';

  /* ── CONFIG ── */
  const BLOCKS      = 28;   // number of progress segments
  const SKIP_SEC    = 10;   // seconds to skip on ◄◄ / ►► buttons
  const TICK_COUNT  = 5;    // number of tick labels on progress bar

  /* ── ELEMENTS ── */
  const grid          = document.getElementById('mediaGrid');
  const filterNav     = document.getElementById('filterNav');
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
    controls: [],          // we provide our own
    keyboard: { focused: true, global: false },
    tooltips: { controls: false, seek: false },
  });

  /* ── STATE ── */
  let currentType   = 'vid';
  let isPhotoMode   = false;
  let volume        = 1.0;
  let muted         = false;

  /* ── HELPERS ── */
  function fmt(sec) {
    if (!isFinite(sec) || isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }

  function updateProgress() {
    if (isPhotoMode) return;
    const dur  = plyr.duration  || 0;
    const cur  = plyr.currentTime || 0;
    const pct  = dur > 0 ? cur / dur : 0;
    const fill = Math.round(pct * BLOCKS);

    document.querySelectorAll('.prog-block').forEach((b, i) => {
      b.classList.toggle('filled', i < fill);
    });

    // Time display
    timeDisplay.innerHTML = fmt(cur) + ' / ' + fmt(dur) + '<span class="blink">_</span>';

    // End label
    progEnd.textContent = fmt(dur);

    // Tick labels
    const ticks = document.querySelectorAll('.prog-tick');
    ticks.forEach((t, i) => {
      const ratio = i / (ticks.length - 1);
      t.textContent = i === 0 || i === ticks.length - 1 ? '' : fmt(ratio * dur);
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

  function setMeta(thumb) {
    metaFilename.textContent = thumb.dataset.label  || '';
    metaInfo.textContent     = thumb.dataset.info   || '';
    const tags = (thumb.dataset.tags || '').split(',').filter(Boolean);
    tagRow.innerHTML = tags.map(t => `<span class="tag">${t.trim()}</span>`).join('');
  }

  /* ── SWITCH TO VIDEO ── */
  function loadVideo(thumb) {
    isPhotoMode = false;
    playerScreen.style.display = '';
    photoDisplay.classList.remove('active');

    plyr.pause();
    plyr.source = {
      type: 'video',
      sources: [{ src: thumb.dataset.src, type: 'video/mp4' }],
    };
    plyr.once('loadedmetadata', () => {
      updateProgress();
      plyr.play();
    });
    setMeta(thumb);
    updatePlayBtn();
  }

  /* ── SWITCH TO PHOTO ── */
  function loadPhoto(thumb) {
    isPhotoMode = true;
    plyr.pause();
    playerScreen.style.display = 'none';
    photoDisplay.classList.add('active');
    photoImg.src = thumb.dataset.src;
    photoImg.alt = thumb.dataset.label || '';
    setMeta(thumb);

    // Reset progress bar for photo mode
    document.querySelectorAll('.prog-block').forEach(b => b.classList.remove('filled'));
    timeDisplay.innerHTML = '-- / --<span class="blink">_</span>';
    progEnd.textContent = '--:--';
    document.querySelectorAll('.prog-tick').forEach(t => { t.textContent = ''; });
    updatePlayBtn();
  }

  /* ── THUMBNAIL CLICK ── */
  grid.addEventListener('click', function (e) {
    const thumb = e.target.closest('.media-thumb');
    if (!thumb) return;

    document.querySelectorAll('.media-thumb').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');

    if (thumb.dataset.type === 'vid') {
      loadVideo(thumb);
    } else {
      loadPhoto(thumb);
    }
  });

  /* ── FILTER NAV ── */
  filterNav.addEventListener('click', function (e) {
    const li = e.target.closest('li');
    if (!li) return;
    document.querySelectorAll('#filterNav li').forEach(l => l.classList.remove('active'));
    li.classList.add('active');
    const filter = li.dataset.filter;
    document.querySelectorAll('.media-thumb').forEach(thumb => {
      const match = filter === 'all' || thumb.dataset.type === filter;
      thumb.style.display = match ? '' : 'none';
    });
  });

  /* ── PLAY / PAUSE ── */
  btnPlay.addEventListener('click', function () {
    if (isPhotoMode) return;
    plyr.togglePlay();
  });

  /* ── REWIND / SKIP ── */
  btnRew.addEventListener('click', function () {
    if (isPhotoMode) return;
    plyr.currentTime = Math.max(0, plyr.currentTime - SKIP_SEC);
  });
  btnFwd.addEventListener('click', function () {
    if (isPhotoMode) return;
    plyr.currentTime = Math.min(plyr.duration || 0, plyr.currentTime + SKIP_SEC);
  });

  /* ── VOLUME CLICK (toggle mute) ── */
  volDisplay.addEventListener('click', function () {
    muted = !muted;
    plyr.muted = muted;
    updateVol();
  });

  /* ── FULLSCREEN ── */
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

  /* ── PROGRESS TRACK CLICK (seek) ── */
  progressTrack.addEventListener('click', function (e) {
    if (isPhotoMode || !plyr.duration) return;
    const rect = progressTrack.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    plyr.currentTime = Math.max(0, Math.min(plyr.duration, pct * plyr.duration));
  });

  /* ── PLYR EVENTS ── */
  plyr.on('timeupdate', updateProgress);
  plyr.on('loadedmetadata', updateProgress);
  plyr.on('play',  updatePlayBtn);
  plyr.on('pause', updatePlayBtn);
  plyr.on('ended', updatePlayBtn);
  plyr.on('volumechange', function () {
    volume = plyr.volume;
    muted  = plyr.muted;
    updateVol();
  });

  /* ── INIT ── */
  updateVol();
  updateProgress();

})();