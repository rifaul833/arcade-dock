#!/usr/bin/env node
'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3456;
const HOST = process.env.HOST || '127.0.0.1';
const CONFIG_PATH = path.join(ROOT, 'games.config.js');
const CATEGORIES_PATH = path.join(ROOT, 'categories.config.js');

function loadGames() {
  delete require.cache[require.resolve(CONFIG_PATH)];
  return require(CONFIG_PATH);
}

function loadCategories() {
  delete require.cache[require.resolve(CATEGORIES_PATH)];
  return require(CATEGORIES_PATH);
}

const games = loadGames();

const app = express();

app.use('/launcher', express.static(path.join(ROOT, 'launcher')));

function playUrlFor(game) {
  return game.playPath || `/play/${game.id}/`;
}

function isReady(game) {
  if (game.id === 'breaklock') {
    return fs.existsSync(path.join(ROOT, 'breaklock', 'public', 'index.html'));
  }
  if (game.id === 'mimstris') {
    return fs.existsSync(path.join(ROOT, 'mimstris', 'dist', 'index.html'));
  }
  if (game.overrideEntry) return true;
  const rootRel = game.serveRoot || game.folder;
  return fs.existsSync(path.join(ROOT, rootRel, game.entry));
}

function publicGames() {
  return loadGames().map((g) => ({
    id: g.id,
    name: g.name,
    category: g.category,
    tagline: g.tagline,
    genre: g.genre,
    controls: g.controls,
    accent: g.accent,
    image: g.image || `/launcher/thumbs/${g.id}.jpg`,
    playUrl: playUrlFor(g),
    ready: isReady(g),
  }));
}

app.get('/api/games', (_req, res) => {
  res.json({ games: publicGames(), port: PORT });
});

app.get('/api/catalog', (_req, res) => {
  const categories = loadCategories();
  const catalogGames = publicGames();
  const totalGames = categories.reduce((sum, category) => sum + category.count, 0);
  res.json({
    categories,
    games: catalogGames,
    totalGames,
    playableGames: catalogGames.filter((game) => game.ready).length,
    port: PORT,
  });
});

function missingGameHtml(game) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${game.name} — setup needed</title>
    <style>body{font-family:system-ui;background:#0c0e12;color:#e8eaed;display:grid;place-items:center;min-height:100vh;margin:0}
    .box{max-width:28rem;padding:2rem;border:1px solid #2a3038;border-radius:12px;background:#141820}
    a{color:#3dd6c3}code{background:#0c0e12;padding:.2em .4em;border-radius:4px}</style></head>
    <body><div class="box"><h1>${game.name}</h1>
    <p>This game still needs setup (npm install / build).</p>
    <p>From the HTML5_Games folder run:</p>
    <p><code>npm run setup</code></p>
    <p><a href="/">← Back to launcher</a></p></div></body></html>`;
}

for (const game of games) {
  const rootDir = path.join(ROOT, game.serveRoot || game.folder);
  const mount = game.playPath
    ? game.playPath.replace(/\/$/, '')
    : `/play/${game.id}`;

  // Keep /play/<id> working even when the game uses a custom base path
  if (game.playPath) {
    app.get(`/play/${game.id}`, (_req, res) => res.redirect(game.playPath));
    app.get(`/play/${game.id}/`, (_req, res) => res.redirect(game.playPath));
  }

  if (game.id === 'mk-js') {
    app.get(`${mount}/`, (_req, res) => {
      res.sendFile(path.join(ROOT, 'launcher', 'overrides', 'mkjs.html'));
    });
    app.get(mount, (_req, res) => res.redirect(`${mount}/`));
    app.use(mount, express.static(rootDir));
    continue;
  }

  app.get(`${mount}/`, (_req, res) => {
    const file = path.join(rootDir, game.entry);
    if (!fs.existsSync(file)) {
      return res.status(503).type('html').send(missingGameHtml(game));
    }
    res.sendFile(file);
  });

  app.get(mount, (_req, res) => res.redirect(`${mount}/`));
  app.use(mount, express.static(rootDir));
}

app.get('/', (_req, res) => {
  res.sendFile(path.join(ROOT, 'launcher', 'index.html'));
});

app.use((_req, res) => {
  res.status(404).type('html').send(`<!DOCTYPE html><html><body style="font-family:system-ui;background:#0c0e12;color:#eee;padding:2rem">
    <h1>Not found</h1><p><a href="/" style="color:#3dd6c3">Back to launcher</a></p></body></html>`);
});

app.listen(PORT, HOST, async () => {
  const url = `http://${HOST}:${PORT}`;
  console.log(`\n  Arcade Dock running at ${url}\n`);
  if (process.env.NO_OPEN !== '1') {
    try {
      const open = (await import('open')).default;
      await open(url);
    } catch {
      // browser open is optional
    }
  }
});
