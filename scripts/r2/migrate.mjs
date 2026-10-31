import {readFile} from 'node:fs/promises';
import pg from 'pg';
const url=process.env.PCW_MIGRATION_DATABASE_URL;
if(!url){console.error('Set PCW_MIGRATION_DATABASE_URL in the server environment; do not paste it into a command argument.');process.exit(1);}
const local=['localhost','127.0.0.1','::1'].includes(new URL(url).hostname);
const client=new pg.Client({connectionString:url,ssl:local?false:{rejectUnauthorized:true,...(process.env.DATABASE_CA?{ca:process.env.DATABASE_CA}:{})}});
try{await client.connect();await client.query(await readFile(new URL('../../db/001_workspace.sql',import.meta.url),'utf8'));const check=await client.query("SELECT count(*)::integer AS tables FROM pg_tables WHERE schemaname='pcw' AND rowsecurity=true");console.log(JSON.stringify({migration:'001_workspace',rlsTables:check.rows[0].tables,status:'applied'}));}catch(error){console.error(JSON.stringify({status:'failed',code:error.code||'DATABASE_ERROR'}));process.exitCode=1;}finally{await client.end();}
