import { readFile, writeFile } from 'node:fs/promises';

// Reproducible projection of reviewed public GitHub evidence. No network or invented metrics.
export async function composeWatchData() {
  const sources = await Promise.all(['core', 'catalog', 'workspace'].map(name => readFile(`data/${name}-evidence.json`, 'utf8').then(JSON.parse)));
  const projects = sources.flatMap(source => source.projects);
  const order = ['riftlet', 'vaiwl', 'paia', 'todayaction', 'workspace', 'paia-ime', 'hcl-assistant', 'semantic-lab'];
  const watching = new Set(['riftlet', 'vaiwl', 'todayaction']);
  const normalized = [];
  for (const id of order) {
    const source = projects.find(project => project.id === id);
    if (!source || source.visibility === 'private' || source.github?.repository?.private) throw new Error(`Missing public project ${id}`);
    const p = structuredClone(source);
    p.name ||= p.title;
    p.headSha ||= p.sourceSha;
    p.watching = watching.has(id);
    p.commentIssue = p.trackedPr || p.primaryPullNumber || null;
    p.phase.key ||= ({ paia:'development', todayaction:'validation', 'paia-ime':'validation', 'hcl-assistant':'development', 'semantic-lab':'research' })[id] || 'prototype';
    p.plan.scopeComplete = false; // These plans do not define the entire product's completion denominator.
    p.plan.scopeLabel = id === 'hcl-assistant' ? '当前 11 个工程包' : p.plan.scopeLabel || '当前计划摘录';
    p.attention = (p.attention || p.alerts || []).filter(item => !item.conditional).map(item => ({...item, ref:item.ref || item.sourceRef || p.headSha, detail:item.detail || item.reason || '', at:item.at || item.sourceUpdatedAt || p.observedAt, kind:({unverified:'verify',confirmation:'decision'})[item.kind] || item.kind }));
    p.evidenceLimitations ||= p.limitations || [];
    const icon = typeof p.icon === 'string' ? {path:p.icon,kind:'source-asset',sourceUrl:p.iconSource} : p.icon || {kind:'initials',text:p.initials};
    if (icon.path) icon.data = `data:image/svg+xml;base64,${(await readFile(icon.path)).toString('base64')}`;
    p.icon = icon;
    p.initials ||= icon.text || p.name.slice(0,1);
    if (p.github) {
      const g = p.github;
      p.snapshot = {repo:p.repo,source:'github-reviewed-snapshot',fetchedAt:g.fetchedAt,repository:g.repository,pullRequests:(g.pullRequests||[]).map(({body,...pull})=>pull),workflowRuns:g.runs||[],commits:g.commits||[],issues:[],comments:[],warnings:[],coverage:{...g.coverage,reviewedSource:true}};
      p.workflows = g.runs || [];
      delete p.github;
    }
    const latest = p.rounds?.[0];
    p.current ||= {headline:p.currentSummary,done:latest?.done || [],blocked:latest?.failed || [],next:p.currentWork,sources:latest?.sources || [{label:'开发依据',url:p.phase.sourceUrl}]};
    if (id === 'vaiwl') {
      p.currentSummary = '普通聊天能打开工作区，项目页仍打不开';
      p.currentWork = '修复项目页入口，补齐失败原因，再定向复验。';
      p.current.done = ['普通聊天已能点击展开工作区', '当前 Free 自动检查通过', 'Free + Pro 候选已完成工程集成'];
      p.current.blocked = ['项目页工作区和返回按钮未出现', '失败原因还未被诊断准确记录'];
      p.attention[0].title = '项目页工作区没有打开';
      p.attention[0].detail = '原生项目列表可见，但工作区与返回按钮没有出现；正在定位原因。';
    }
    p.previousPlans = (p.previousPlans || []).map(plan => ({...plan,items:plan.items || [],summary:plan.summary || ''}));
    p.notes = [{id:`source-${id}`,title:p.plan.title,text:p.plan.scopeLabel,url:p.plan.sourceUrl,createdAt:p.observedAt}];
    p.tasks = [];
    delete p.alerts;
    delete p.previousPlan;
    delete p.progress;
    normalized.push(p);
  }
  const output = `// Generated from data/*-evidence.json and original repository icon assets.\nexport const catalogRevision = '2026-11-01-watch-r3';\nexport const watchCatalog = ${JSON.stringify(normalized, null, 2)};\n`;
  await writeFile('src/watch-data.js', output);
  return normalized;
}

if (process.argv[1]?.endsWith('compose-watch-data.mjs')) {
  const projects = await composeWatchData();
  console.log(`Composed ${projects.length} public project cards from reviewed sources.`);
}
