// Build with Node.js only. Never copy the checkout, backups or development tools.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const source = path.resolve(__dirname, '../../..');
const appSource = path.join(source, 'resources/app');
const limit = 500_000_000; // Decimal MB: also below the 500 MiB shown by Windows.
const runtimeFiles = [
  'AuroraMIDI.exe', 'chrome_100_percent.pak', 'chrome_200_percent.pak',
  'd3dcompiler_47.dll', 'dxcompiler.dll', 'electron_wer.dll', 'ffmpeg.dll',
  'icudtl.dat', 'resources.pak', 'snapshot_blob.bin', 'v8_context_snapshot.bin',
  'vk_swiftshader.dll', 'vk_swiftshader_icd.json', 'vulkan-1.dll',
  'LICENSE', 'LICENSE_AURORA.txt', 'LICENSES.chromium.html', 'version'
];
const locales = ['en-US.pak', 'pt-BR.pak', 'pt-PT.pak'];
// These source PNGs have WebP equivalents already used by Cifra Dog.
// Fail if a future version starts referencing one of the omitted originals.
const webpOnly = [
  'brand/dog-pub', 'brand/genres-atlas', 'brand/logo-pub',
  'taverna/covers-atlas', 'taverna/materials-atlas',
  'taverna/pub-background', 'taverna/pub-mobile'
].map(name => 'integrations/cifra-dog/v2/img/' + name + '.png');
const appDirectories = new Set(['assets', 'integrations']);

function walk(root, prefix = '') {
  return fs.readdirSync(path.join(root, prefix), {withFileTypes: true})
    .flatMap(entry => {
      const relative = prefix ? prefix + '/' + entry.name : entry.name;
      if (entry.isSymbolicLink()) throw Error('Link inesperado: ' + relative);
      return entry.isDirectory() ? walk(root, relative) : [relative];
    }).sort();
}

function build(output) {
  output = path.resolve(output);
  // Permit a new dist directory, but never write over application sources.
  const relative = path.relative(source, output);
  if (!relative || (!relative.startsWith('..' + path.sep) &&
      !path.isAbsolute(relative) && relative.split(path.sep)[0] !== 'dist')) {
    throw Error('Escolha uma pasta nova fora dos fontes ou dentro de dist.');
  }
  if (source.startsWith(output + path.sep)) throw Error('Destino contem os fontes.');
  if (fs.existsSync(output)) throw Error('A pasta de destino ja existe: ' + output);

  const applicationFiles = walk(appSource).filter(file => {
    if (file.includes('/')) return appDirectories.has(file.split('/')[0]);
    return !file.startsWith('tests') && !file.endsWith('.md') &&
      /\.(?:js|cjs|css|html|ps1|cs|json|txt)$/.test(file);
  });
  const referenceTexts = applicationFiles.filter(file => /\.(?:js|cjs|css|html|json)$/.test(file))
    .map(file => fs.readFileSync(path.join(appSource, file), 'utf8'));
  for (const png of webpOnly) {
    if (!fs.existsSync(path.join(appSource, png.replace(/\.png$/, '.webp')))) {
      throw Error('Imagem WebP ausente: ' + png);
    }
    if (referenceTexts.some(text => text.includes(path.posix.basename(png)))) {
      throw Error('O PNG ainda e usado pelo aplicativo: ' + png);
    }
  }
  const files = [
    ...runtimeFiles,
    ...locales.map(file => 'locales/' + file),
    ...applicationFiles.filter(file => !webpOnly.includes(file)).map(file => 'resources/app/' + file)
  ];
  let plannedBytes = 0;
  for (const file of files) {
    const stat = fs.statSync(path.join(source, file));
    if (!stat.isFile()) throw Error('Arquivo obrigatorio invalido: ' + file);
    plannedBytes += stat.size;
  }
  if (plannedBytes >= limit - 1_000_000) throw Error('O pacote ultrapassa o limite de 500 MB.');

  fs.mkdirSync(path.dirname(output), {recursive: true});
  const staging = fs.mkdtempSync(path.join(path.dirname(output), '.aurora-portable-'));
  try {
    for (const file of files) {
      const target = path.join(staging, file);
      fs.mkdirSync(path.dirname(target), {recursive: true});
      fs.copyFileSync(path.join(source, file), target);
    }
    const pkg = JSON.parse(fs.readFileSync(path.join(appSource, 'package.json'), 'utf8'));
    delete pkg.devDependencies;
    delete pkg.scripts;
    fs.writeFileSync(path.join(staging, 'resources/app/package.json'), JSON.stringify(pkg, null, 2) + '\n');
    fs.writeFileSync(path.join(staging, 'COMO_USAR.txt'),
      'Aurora MIDI ' + pkg.version + ' - Portatil leve\r\n\r\n' +
      'Extraia a pasta inteira e abra AuroraMIDI.exe com dois cliques.\r\n' +
      'Mantenha o executavel junto das pastas resources e locales e das DLLs.\r\n' +
      'Nao precisa instalar Node.js, npm ou baixar componentes para tocar MIDI.\r\n' +
      'Inclui o audio nativo do Windows, karaoke, mixer, acordes, teclado ao vivo e Cifra Dog.\r\n' +
      'Os timbres MIDI e o motor de audio sao os mesmos da versao original.\r\n' +
      'Nao inclui historico Git, backups, testes nem imagens PNG duplicadas.\r\n' +
      'Recursos de idioma do runtime: portugues do Brasil/Portugal e ingles.\r\n');
    const manifest = walk(staging).map(file => {
      const bytes = fs.readFileSync(path.join(staging, file));
      return {file, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex')};
    });
    fs.writeFileSync(path.join(staging, 'package-manifest.json'), JSON.stringify({
      version: pkg.version, maxBytes: limit, locales, files: manifest
    }, null, 2) + '\n');
    const bytes = walk(staging).reduce((sum, file) => sum + fs.statSync(path.join(staging, file)).size, 0);
    if (bytes >= limit) throw Error('O pacote ultrapassa o limite de 500 MB.');
    fs.renameSync(staging, output);
    return {output, bytes, MB: +(bytes / 1_000_000).toFixed(2), files: manifest.length + 1};
  } catch (error) {
    // Delete only the temporary directory this invocation just created.
    fs.rmSync(staging, {recursive: true, force: true});
    throw error;
  }
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 2 || args[0] !== '--out')) {
      throw Error('Uso: node dev-tools/build-portable.cjs [--out PASTA_NOVA]');
    }
    console.log(JSON.stringify(build(args[1] || path.join(source, 'dist/AuroraMIDI_Leve')), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = {build};
