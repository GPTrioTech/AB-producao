// Validação estática: não executa código Apps Script nem acessa serviços externos.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const errors = [];
let scripts = 0;
let links = 0;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (['.git', 'node_modules'].includes(entry.name)) return [];
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}
function compile(source, file) {
  try {
    new vm.Script(source, { filename: file });
    scripts++;
  } catch (error) {
    errors.push(`${file}: ${error.message}`);
  }
}

for (const file of walk(root)) {
  const relative = path.relative(root, file);
  if (/\.(gs|js|cjs)$/.test(file)) compile(fs.readFileSync(file, 'utf8'), relative);
  if (file.endsWith('.html')) {
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/\bsrc\s*=|\btype\s*=\s*["'](?:application\/ld\+json|application\/json)/i.test(match[1])) continue;
      compile(match[2], relative + ':script');
    }
  }
  if (file.endsWith('.md')) {
    const markdown = fs.readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
    for (const match of markdown.matchAll(/\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
      const url = match[1];
      if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(url)) continue;
      let target;
      try { target = decodeURIComponent(url.split(/[?#]/)[0]); }
      catch { errors.push(`${relative}: URL inválida ${url}`); continue; }
      const absolute = path.resolve(path.dirname(file), target);
      const rel = path.relative(root, absolute);
      if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel) || !fs.existsSync(absolute)) {
        errors.push(`${relative}: destino local não encontrado: ${url}`);
      }
      links++;
    }
  }
}

const html = fs.readFileSync(path.join(root, 'meu-software/frontend/MVP_AB_App.html'), 'utf8');
const controller = fs.readFileSync(path.join(root, 'meu-software/frontend/MiniSoftware.gs'), 'utf8');
const front = html.match(/const\s+FRONT_VERSION\s*=\s*['"]([^'"]+)['"]/);
const server = controller.match(/const\s+FRONT_AB_VERSION\s*=\s*['"]([^'"]+)['"]/);
if (!front || !server || front[1] !== server[1]) errors.push('Versões do HTML e controller incompatíveis ou ausentes.');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`OK: ${scripts} scripts com sintaxe válida, ${links} links locais e versões compatíveis (${front[1]}).`);
  console.log('Esta verificação não substitui o smoke test no ambiente Google.');
}
