import {configuration} from '../../server/config.js';
import {database} from '../../server/database.js';
import {runWorker} from '../../server/worker.js';
const config=configuration();if(!config.configured){console.error(JSON.stringify({status:'NOT_CONFIGURED',issues:config.setupIssues.map(x=>x.code)}));process.exit(1);}
const store=database(config);
try{const queued=await store.schedule();await store.heartbeat('scheduler',{source:'independent-worker',queued});const result=await runWorker({store,config,maxJobs:10,maxMillis:110000});console.log(JSON.stringify(result));}finally{await store.pool.end();}
