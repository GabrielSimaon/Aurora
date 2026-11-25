const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {build} = require('../dev-tools/build-portable.cjs');

(async () => {
  assert(process.argv[2], 'Informe a pasta do pacote portatil.');
  const root = path.resolve(process.argv[2]);
  const appRoot = path.join(root, 'resources/app');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package-manifest.json'), 'utf8'));
  let bytes = fs.statSync(path.join(root, 'package-manifest.json')).size;
  for (const entry of manifest.files) {
    const data = fs.readFileSync(path.join(root, entry.file));
    assert.equal(data.length, entry.bytes, entry.file);
    assert.equal(crypto.createHash('sha256').update(data).digest('hex'), entry.sha256, entry.file);
    bytes += data.length;
  }
  assert(bytes < 500_000_000, 'Pacote descompactado deve ficar abaixo de 500 MB.');
  for (const excluded of ['.git', '.work', 'Backups_Atualizacao', 'resources/app/dev-tests',
      'resources/app/dev-tools', 'resources/app/node_modules', 'resources/default_app.asar']) {
    assert(!fs.existsSync(path.join(root, excluded)), excluded);
  }
  assert.deepEqual(fs.readdirSync(path.join(root, 'locales')).sort(), ['en-US.pak', 'pt-BR.pak', 'pt-PT.pak']);
  assert.throws(() => build(path.resolve(__dirname, '..')), /fontes/);
  assert.throws(() => build(root), /ja existe/);

  // All local styles/scripts/images and Cifra Dog offline cache entries must survive packaging.
  function walk(dir) {
    return fs.readdirSync(dir, {withFileTypes: true}).flatMap(e =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
  }
  for (const file of walk(appRoot).filter(file => file.endsWith('.html'))) {
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) {
      const ref = match[1].split(/[?#]/)[0];
      if (!ref || /^(?:[a-z]+:|\/\/)/i.test(ref)) continue;
      const target = path.resolve(path.dirname(file), ref);
      assert(fs.existsSync(target), file + ' references missing ' + ref);
    }
  }
  const cifraRoot = path.join(appRoot, 'integrations/cifra-dog/v2');
  const sw = fs.readFileSync(path.join(cifraRoot, 'sw.js'), 'utf8');
  const cacheList = sw.match(/const ARQUIVOS = \[([\s\S]*?)\];/)[1];
  for (const match of cacheList.matchAll(/'(\.\/[^']*)'/g)) {
    assert(fs.existsSync(path.resolve(cifraRoot, match[1])), 'Offline asset: ' + match[1]);
  }
  const core = require(path.join(appRoot, 'midi-core.js'));
  const song = core.parse(core.demo());
  assert(song.notes.length > 0);
  console.log('PASS production manifest hashes, <500 MB, builder path protection, local assets and Cifra Dog offline assets');
  if (process.argv.includes('--static')) return;

  const {_electron} = require('playwright');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-portable-test-'));
  let electron;
  try {
    electron = await _electron.launch({
      executablePath: path.join(root, 'AuroraMIDI.exe'),
      args: ['--user-data-dir=' + profile],
      timeout: 30000
    });
    const page = await electron.firstWindow();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.waitForFunction(() => window.auroraSessionReady && dockWorkspace.active);
    const state = await page.evaluate(async () => {
      // Keep the real user library and playback preferences untouched.
      const song = MidiCore.parse(MidiCore.demo());
      player.load(song);
      await player.play();
      return {notes: song.notes.length, playing: player.playing,
        frames: document.querySelectorAll('.dock-tile iframe').length,
        native: await window.desktop.getState()};
    });
    assert(state.playing);
    assert(state.notes > 0);
    assert(state.frames >= 5, 'Embedded workspace panels must load.');
    await page.waitForTimeout(800);
    assert(await page.evaluate(() => player.position > 0), 'Transport must advance.');
    const keyboardOpened = electron.waitForEvent('window', {timeout: 10000});
    await page.evaluate(() => {player.pause(); window.desktop.openLiveKeyboard(true);});
    await keyboardOpened;
    assert.deepEqual(errors, []);
    console.log('PASS packaged Electron starts, docked panels load, demo plays/advances/pauses and left-hand keyboard opens');
    console.log(JSON.stringify({bytes, MB: +(bytes / 1e6).toFixed(2), native: state.native}));
  } finally {
    await electron?.close();
    // Profile is temporary and isolated by --user-data-dir.
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
