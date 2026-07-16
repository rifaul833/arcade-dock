(() => {
  const grid = document.getElementById('game-grid');
  const countEl = document.getElementById('game-count');
  const playframe = document.getElementById('playframe');
  const iframe = document.getElementById('game-iframe');
  const playTitle = document.getElementById('play-title');
  const btnNewTab = document.getElementById('btn-new-tab');
  const btnClose = document.getElementById('btn-close-play');
  const btnRandom = document.getElementById('btn-random');

  let games = [];
  let genre = 'all';

  async function load() {
    const res = await fetch('/api/games');
    const data = await res.json();
    games = data.games || [];
    countEl.textContent = String(games.length);
    render();
  }

  function filtered() {
    if (genre === 'all') return games;
    return games.filter((g) => g.genre === genre);
  }

  function render() {
    const list = filtered();
    grid.innerHTML = '';
    list.forEach((game, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `card${game.ready ? '' : ' is-disabled'}`;
      btn.style.setProperty('--accent', game.accent);
      btn.style.animationDelay = `${Math.min(i, 10) * 0.04}s`;
      btn.innerHTML = `
        <div class="card-media">
          <img
            src="${escapeHtml(game.image)}"
            alt=""
            loading="lazy"
            decoding="async"
            onerror="this.parentElement.classList.add('is-fallback')"
          />
          <span class="card-genre">${escapeHtml(game.genre)}</span>
        </div>
        <div class="card-body">
          <h3>${escapeHtml(game.name)}</h3>
          <p>${escapeHtml(game.tagline)}</p>
          <div class="card-footer">
            <span>${escapeHtml(game.controls)}</span>
            <span class="${game.ready ? 'card-play' : 'badge-warn'}">
              ${game.ready ? 'Play →' : 'Needs setup'}
            </span>
          </div>
        </div>
      `;
      if (game.ready) {
        btn.addEventListener('click', () => openGame(game));
      } else {
        btn.title = 'Run npm run setup, then refresh';
        btn.addEventListener('click', () => {
          alert(`${game.name} needs setup.\n\nIn the HTML5_Games folder run:\nnpm run setup\n\nThen refresh this page.`);
        });
      }
      grid.appendChild(btn);
    });
  }

  function openGame(game) {
    playTitle.textContent = game.name;
    btnNewTab.href = game.playUrl;
    iframe.src = game.playUrl;
    playframe.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closePlay() {
    playframe.hidden = true;
    iframe.src = 'about:blank';
    document.body.style.overflow = '';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      genre = chip.dataset.genre || 'all';
      render();
    });
  });

  btnClose.addEventListener('click', closePlay);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !playframe.hidden) closePlay();
  });

  btnRandom.addEventListener('click', () => {
    const ready = games.filter((g) => g.ready);
    if (!ready.length) return;
    const pick = ready[Math.floor(Math.random() * ready.length)];
    openGame(pick);
  });

  load().catch((err) => {
    grid.innerHTML = `<p style="color:#ff6b4a">Could not load games: ${escapeHtml(err.message)}</p>`;
  });
})();
