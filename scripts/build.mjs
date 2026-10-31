import { mkdir, rm, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';

await rm('dist', { recursive: true, force: true });
await mkdir('dist/src', { recursive: true });
const paths=['index.html','legacy.html','src/personal.js','src/personal.css','src/personal-domain.js','src/github-sync.js','src/github-snapshot.js','src/app.js','src/styles.css','src/domain.js'];
for (const path of paths) await copyFile(path, `dist/${path}`);
async function standalone({htmlPath,cssPath,entry,sources,name}) {
  const [html,css,...modules]=await Promise.all([htmlPath,cssPath,...sources].map(p=>readFile(p,'utf8')));
  const inline=modules.map(source=>source.replace(/^import\s+[^;]+;\s*$/gm,'').replace(/^export\s+(?=(?:async\s+)?(?:function|const|let|class)\b)/gm,'')).join('\n');
  const code=`(function(){\n${inline}\n})();`.replace(/<\/script/gi,'<\\/script');
  new Script(code,{filename:name+'.inline.js'});
  const document=html.replace(`<link rel="stylesheet" href="/${cssPath}" />`,`<style>${css}</style>`).replace(`<script type="module" src="/${entry}"></script>`,`<script>${code}</script>`);
  await writeFile(`dist/${name}.html`,document);
  return {file:name+'.html',bytes:Buffer.byteLength(document),sha256:createHash('sha256').update(document).digest('hex')};
}
const personal=await standalone({htmlPath:'index.html',cssPath:'src/personal.css',entry:'src/personal.js',sources:['src/personal-domain.js','src/github-sync.js','src/github-snapshot.js','src/personal.js'],name:'Project-Workspace-Personal-V1'});
const legacy=await standalone({htmlPath:'legacy.html',cssPath:'src/styles.css',entry:'src/app.js',sources:['src/domain.js','src/app.js'],name:'Project-Workspace-R1'});
const manifest={version:'0.2.0',runtimeDependencies:0,personal,legacy,network:'Optional public GitHub GET requests only; app and notes work without network.'};
await writeFile('dist/build-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
