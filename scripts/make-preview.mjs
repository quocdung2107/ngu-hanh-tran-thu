// Gộp dist/index.html + JS/CSS đã build thành 1 file HTML duy nhất ở preview/
// để người dùng double-click mở chơi ngay (không cần server).
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
let html = readFileSync(join(dist, 'index.html'), 'utf8');
const assets = readdirSync(join(dist, 'assets'));

for (const f of assets) {
  const content = readFileSync(join(dist, 'assets', f), 'utf8');
  if (f.endsWith('.js')) {
    html = html.replace(new RegExp(`<script[^>]*src="[^"]*${f}"[^>]*></script>`), () => `<script type="module">\n${content}\n</script>`);
  } else if (f.endsWith('.css')) {
    html = html.replace(new RegExp(`<link[^>]*href="[^"]*${f}"[^>]*>`), () => `<style>\n${content}\n</style>`);
  }
}
if (html.includes('/assets/') || html.includes('src="/src')) {
  throw new Error('Preview còn tham chiếu file ngoài — inline thất bại');
}
mkdirSync(join(root, 'preview'), { recursive: true });
const out = join(root, 'preview', 'ngu-hanh-tran-thu-mvp.html');
writeFileSync(out, html);
console.log('Preview written:', out, `(${(html.length / 1024).toFixed(1)} KB)`);
