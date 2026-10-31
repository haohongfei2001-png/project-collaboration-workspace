import { mkdir, rm, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';

await rm('dist', { recursive: true, force: true });
await mkdir('dist/src', { recursive: true });
for (const path of ['index.html', 'src/app.js', 'src/styles.css', 'src/domain.js']) await copyFile(path, `dist/${path}`);
const [html, css, domain, app] = await Promise.all(['index.html', 'src/styles.css', 'src/domain.js', 'src/app.js'].map(p => readFile(p, 'utf8')));
// A second, standalone build lets reviewers open the prototype without a server.
// All code is authored in this repository. No runtime CDN, external font or API.
const inlineDomain = domain.replace(/^export\s+(?=(?:function|const|let|class)\b)/gm, '').replace(/^export\s*\{[^}]*\};?\s*$/gm, '');
const inlineApp = app.replace(/^import\s+[\s\S]*?from\s+['"]\.\/domain\.js['"];?\s*/m, '');
const code = `(function(){\n${inlineDomain}\n${inlineApp}\n})();`.replace(/<\/script/gi, '<\\/script');
new Script(code, { filename: 'Project-Workspace-R1.inline.js' });
const standalone = html.replace('<link rel="stylesheet" href="/src/styles.css" />', `<style>${css}</style>`).replace('<script type="module" src="/src/app.js"></script>', `<script>${code}</script>`);
await writeFile('dist/Project-Workspace-R1.html', standalone);
const manifest = { version: '0.1.0', runtimeDependencies: 0, standaloneBytes: Buffer.byteLength(standalone), sha256: createHash('sha256').update(standalone).digest('hex') };
await writeFile('dist/build-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest, null, 2));
