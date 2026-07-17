(() => {
  const grid = document.getElementById('game-grid');
  const countEl = document.getElementById('game-count');
  const categoryCountEl = document.getElementById('category-count');
  const libraryTitle = document.getElementById('library-title');
  const librarySubtitle = document.getElementById('library-subtitle');
  const categoryBack = document.getElementById('category-back');
  const playframe = document.getElementById('playframe');
  const iframe = document.getElementById('game-iframe');
  const playTitle = document.getElementById('play-title');
  const btnNewTab = document.getElementById('btn-new-tab');
  const btnClose = document.getElementById('btn-close-play');
  const btnRandom = document.getElementById('btn-random');

  let categories = [];
  let games = [];
  let totalGames = 0;

  async function load() {
    const res = await fetch('/api/catalog');
    if (!res.ok) throw new Error(`Catalog request failed (${res.status})`);
    const data = await res.json();
    categories = data.categories || [];
    games = data.games || [];
    totalGames = data.totalGames || 0;
    categoryCountEl.textContent = String(categories.length);
    countEl.textContent = String(totalGames);
    renderRoute();
  }

  function categoryFromHash() {
    const match = window.location.hash.match(/^#category\/([^/?#]+)/);
    if (!match) return null;
    const id = decodeURIComponent(match[1]);
    return categories.find((category) => category.id === id) || null;
  }

  function renderRoute() {
    const category = categoryFromHash();
    if (category) {
      renderCategory(category);
    } else {
      renderCategories();
    }
  }

  function renderCategories() {
    libraryTitle.textContent = 'Game Categories';
    librarySubtitle.textContent =
      `${categories.length} categories · ${totalGames} games in the full collection`;
    categoryBack.hidden = true;
    grid.innerHTML = '';

    categories.forEach((category, i) => {
      const playable = games.filter(
        (game) => game.category === category.id && game.ready,
      ).length;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'card category-card';
      btn.style.setProperty('--accent', category.accent);
      btn.style.animationDelay = `${Math.min(i, 10) * 0.04}s`;
      btn.innerHTML = `
        <div class="card-media">
          <div class="category-art" aria-hidden="true">
            <span class="category-icon">${escapeHtml(category.icon)}</span>
            <span class="category-grid-lines"></span>
          </div>
          <span class="card-genre">Collection ${String(i + 1).padStart(2, '0')}</span>
        </div>
        <div class="card-body">
          <h3>${escapeHtml(category.name)}</h3>
          <p>${escapeHtml(category.description)}</p>
          <div class="card-footer">
            <span>${category.count} games</span>
            <span class="card-play">${playable ? `${playable} playable` : 'Explore'} →</span>
          </div>
        </div>
      `;
      btn.addEventListener('click', () => openCategory(category));
      grid.appendChild(btn);
    });
  }

  function renderCategory(category) {
    const categoryGames = games.filter((game) => game.category === category.id);
    const placeholdersNeeded = Math.max(0, category.count - categoryGames.length);
    const placeholderGames = Array.from({ length: placeholdersNeeded }, (_, index) => ({
      id: `${category.id}-slot-${index + categoryGames.length + 1}`,
      name: `Game Slot ${String(index + categoryGames.length + 1).padStart(2, '0')}`,
      category: category.id,
      genre: category.name.replace(/ Games$/, ''),
      tagline: 'This game will be added to Arcade Dock soon.',
      controls: 'Coming soon',
      accent: category.accent,
      placeholder: true,
    }));

    libraryTitle.textContent = category.name;
    librarySubtitle.textContent =
      `${category.count} games · ${categoryGames.filter((game) => game.ready).length} available to play now`;
    categoryBack.hidden = false;
    grid.innerHTML = '';

    [...categoryGames, ...placeholderGames].forEach((game, i) => {
      grid.appendChild(createGameCard(game, category, i));
    });
  }

  function createGameCard(game, category, index) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `card${game.placeholder ? ' is-placeholder' : game.ready ? '' : ' is-disabled'}`;
    btn.style.setProperty('--accent', game.accent || category.accent);
    btn.style.animationDelay = `${Math.min(index, 10) * 0.04}s`;

    const media = game.placeholder
      ? `
        <div class="card-media placeholder-media">
          <div class="placeholder-art" aria-hidden="true">
            <span>${escapeHtml(category.icon)}</span>
            <small>Coming soon</small>
          </div>
          <span class="card-genre">${escapeHtml(game.genre)}</span>
        </div>
      `
      : `
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
      `;

    const status = game.placeholder
      ? '<span class="badge-soon">Coming soon</span>'
      : game.ready
        ? '<span class="card-play">Play →</span>'
        : '<span class="badge-warn">Needs setup</span>';

    btn.innerHTML = `
      ${media}
      <div class="card-body">
        <h3>${escapeHtml(game.name)}</h3>
        <p>${escapeHtml(game.tagline)}</p>
        <div class="card-footer">
          <span>${escapeHtml(game.controls)}</span>
          ${status}
        </div>
      </div>
    `;

    if (game.placeholder) {
      btn.setAttribute('aria-disabled', 'true');
      btn.title = 'Coming soon';
    } else if (game.ready) {
      btn.addEventListener('click', () => openGame(game));
    } else {
      btn.title = 'Run npm run setup, then refresh';
      btn.addEventListener('click', () => {
        alert(
          `${game.name} needs setup.\n\nIn the HTML5_Games folder run:\nnpm run setup\n\nThen refresh this page.`,
        );
      });
    }

    return btn;
  }

  function openCategory(category) {
    window.location.hash = `category/${encodeURIComponent(category.id)}`;
    document.getElementById('library').scrollIntoView({ behavior: 'smooth' });
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
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  categoryBack.addEventListener('click', () => {
    window.location.hash = '';
    document.getElementById('library').scrollIntoView({ behavior: 'smooth' });
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

  window.addEventListener('hashchange', renderRoute);

  load().catch((err) => {
    grid.innerHTML = `<p style="color:#ff6b4a">Could not load games: ${escapeHtml(err.message)}</p>`;
  });
})();
