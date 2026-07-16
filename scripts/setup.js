#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const games = require('../games.config');

const ROOT = path.join(__dirname, '..');

function log(msg) {
  console.log(`\x1b[36m[setup]\x1b[0m ${msg}`);
}

function warn(msg) {
  console.warn(`\x1b[33m[setup]\x1b[0m ${msg}`);
}

function run(cmd, args, cwd) {
  log(`${cmd} ${args.join(' ')}  (${path.relative(ROOT, cwd) || '.'})`);
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, NODE_ENV: 'development' },
  });
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${cmd} ${args.join(' ')} in ${cwd}`);
  }
}

function hasNodeModules(dir) {
  return fs.existsSync(path.join(dir, 'node_modules'));
}

function installNpm(dir) {
  const pkg = path.join(dir, 'package.json');
  if (!fs.existsSync(pkg)) return;
  if (hasNodeModules(dir) && process.env.FORCE_INSTALL !== '1') {
    log(`deps already present: ${path.relative(ROOT, dir)}`);
    return;
  }
  const lock = fs.existsSync(path.join(dir, 'package-lock.json'));
  const yarnLock = fs.existsSync(path.join(dir, 'yarn.lock'));
  if (yarnLock && !lock) {
    run('npm', ['install', '--legacy-peer-deps'], dir);
  } else if (lock) {
    run('npm', ['ci', '--legacy-peer-deps'], dir);
  } else {
    run('npm', ['install', '--legacy-peer-deps'], dir);
  }
}

function setupBreaklock(game) {
  const dir = path.join(ROOT, game.packageDir);
  installNpm(dir);
  const publicIndex = path.join(ROOT, game.serveRoot, 'index.html');
  if (fs.existsSync(publicIndex) && process.env.FORCE_BUILD !== '1') {
    log('breaklock public/ already built — skip');
    return;
  }
  run('npm', ['run', 'build'], dir);
}

function setupMimstris(game) {
  const dir = path.join(ROOT, game.packageDir);
  installNpm(dir);
  const distIndex = path.join(ROOT, game.serveRoot, 'index.html');
  if (fs.existsSync(distIndex) && process.env.FORCE_BUILD !== '1') {
    log('mimstris dist/ already built — skip');
    return;
  }
  run(
    'npx',
    ['vite', 'build', '--base', `/play/${game.id}/`],
    dir,
  );
}

function setupTowerGame(game) {
  const dir = path.join(ROOT, game.packageDir);
  installNpm(dir);
  const distMain = path.join(dir, 'dist', 'main.js');
  if (fs.existsSync(distMain) && process.env.FORCE_BUILD !== '1') {
    log('tower_game dist/ already present — skip rebuild');
    return;
  }
  run('npm', ['run', 'build'], dir);
}

async function main() {
  log('Installing game requirements…');

  const bySetup = {
    'npm-build': [],
    'vite-build': [],
    static: [],
  };

  for (const game of games) {
    bySetup[game.setup || 'static'].push(game);
  }

  for (const game of bySetup['npm-build']) {
    try {
      if (game.id === 'breaklock') setupBreaklock(game);
      else if (game.id === 'tower-game') setupTowerGame(game);
      else {
        installNpm(path.join(ROOT, game.packageDir));
        run('npm', ['run', 'build'], path.join(ROOT, game.packageDir));
      }
    } catch (err) {
      warn(`Failed ${game.name}: ${err.message}`);
      process.exitCode = 1;
    }
  }

  for (const game of bySetup['vite-build']) {
    try {
      setupMimstris(game);
    } catch (err) {
      warn(`Failed ${game.name}: ${err.message}`);
      process.exitCode = 1;
    }
  }

  for (const game of bySetup.static) {
    log(`static — ready: ${game.name}`);
  }

  // Optional pacman deps (game also runs fully static)
  const pacman = path.join(ROOT, 'pacman-canvas');
  if (fs.existsSync(path.join(pacman, 'package.json'))) {
    try {
      installNpm(pacman);
    } catch (err) {
      warn(`pacman-canvas npm optional install skipped: ${err.message}`);
    }
  }

  if (process.exitCode) {
    warn('Setup finished with errors. Static games still work; fix the failed builds above.');
  } else {
    log('All game requirements installed. Run: npm start');
  }
}

main();
