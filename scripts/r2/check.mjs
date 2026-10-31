import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
for(const folder of ['src','server','api','scripts/r2'])for(const file of await readdir(folder)){if(!/\.(m?js)$/.test(file))continue;const result=spawnSync(process.execPath,['--check',`${folder}/${file}`],{stdio:'inherit'});if(result.status)process.exit(result.status);}
console.log('JavaScript syntax checked.');
