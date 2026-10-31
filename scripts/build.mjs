import { mkdir, rm, readFile, writeFile, copyFile, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';
import { composeWatchData } from './compose-watch-data.mjs';

await composeWatchData();
await rm('dist', { recursive: true, force: true });
await mkdir('dist/src', { recursive: true });
const paths=['index.html','watch-v1.html','personal-v1.html','legacy.html','src/watch.js','src/watch-v1.js','src/watch-api.js','src/watch.css','src/watch-domain.js','src/watch-sync.js','src/watch-data.js','src/personal.js','src/personal.css','src/personal-domain.js','src/github-sync.js','src/github-snapshot.js','src/app.js','src/styles.css','src/domain.js'];
for (const path of paths) await copyFile(path, `dist/${path}`);
await cp('assets','dist/assets',{recursive:true});
async function standalone({htmlPath,cssPath,entry,sources,name}) {
  const [html,css,...modules]=await Promise.all([htmlPath,cssPath,...sources].map(p=>readFile(p,'utf8')));
  const inline=modules.map(source=>source.replace(/^import\s+[^;]+;\s*$/gm,'').replace(/^export\s+(?=(?:async\s+)?(?:function|const|let|class)\b)/gm,'')).join('\n');
  const code=`(function(){\n${inline}\n})();`.replace(/<\/script/gi,'<\\/script');
  new Script(code,{filename:name+'.inline.js'});
  const document=html.replace(`<link rel="stylesheet" href="/${cssPath}" />`,`<style>${css}</style>`).replace(`<script type="module" src="/${entry}"></script>`,`<script>${code}</script>`);
  await writeFile(`dist/${name}.html`,document);
  return {file:name+'.html',bytes:Buffer.byteLength(document),sha256:createHash('sha256').update(document).digest('hex')};
}
const watch=await standalone({htmlPath:'watch-v1.html',cssPath:'src/watch.css',entry:'src/watch-v1.js',sources:['src/watch-domain.js','src/watch-sync.js','src/watch-data.js','src/watch-v1.js'],name:'Project-Workspace-Watch-V1'});
const personal=await standalone({htmlPath:'personal-v1.html',cssPath:'src/personal.css',entry:'src/personal.js',sources:['src/personal-domain.js','src/github-sync.js','src/github-snapshot.js','src/personal.js'],name:'Project-Workspace-Personal-V1'});
const legacy=await standalone({htmlPath:'legacy.html',cssPath:'src/styles.css',entry:'src/app.js',sources:['src/domain.js','src/app.js'],name:'Project-Workspace-R1'});
const manifest={version:'0.4.0',runtimeDependencies:2,watch,personal,legacy,network:'R2 requires same-origin authenticated backend. Preserved V1 artifacts are separate historical prototypes.'};
await writeFile('dist/build-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
