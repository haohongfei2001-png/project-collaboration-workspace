export function configuration(env = process.env) {
  const origin = env.PCW_ORIGIN || (env.VERCEL_BRANCH_URL ? `https://${env.VERCEL_BRANCH_URL}` : null) || (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : 'http://localhost:3000');
  const config = {
    origin, databaseUrl: env.DATABASE_URL || '', databaseCa: env.DATABASE_CA || '',
    encryptionKey: env.PCW_ENCRYPTION_KEY || '', encryptionKeys: env.PCW_ENCRYPTION_KEYS || '',
    appId: env.GITHUB_APP_ID || '', privateKey: (env.GITHUB_APP_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    clientId: env.GITHUB_CLIENT_ID || '', clientSecret: env.GITHUB_CLIENT_SECRET || '',
    appSlug: env.GITHUB_APP_SLUG || '', webhookSecret: env.GITHUB_WEBHOOK_SECRET || '',
    cronSecret: env.CRON_SECRET || '', ownerGithubId: env.PCW_OWNER_GITHUB_ID || '326690450',
    allowedProviderHosts: (env.PCW_PROVIDER_HOSTS || '').split(',').map(x => x.trim()).filter(Boolean),
    production: env.NODE_ENV === 'production' || Boolean(env.VERCEL),
    maxBodyBytes: 2 * 1024 * 1024,
  };
  const setupIssues = [];
  if (!config.databaseUrl) setupIssues.push({ code: 'DATABASE_REQUIRED', title: '连接工作台数据库', detail: '尚未配置独立 PostgreSQL 数据库和迁移。' });
  if (!config.encryptionKey && !config.encryptionKeys) setupIssues.push({ code: 'ENCRYPTION_REQUIRED', title: '配置服务器加密密钥', detail: 'API Key 与 GitHub 授权凭据只在服务端加密保存。' });
  if (![config.appId, config.privateKey, config.clientId, config.clientSecret, config.appSlug, config.webhookSecret].every(Boolean)) setupIssues.push({ code: 'GITHUB_APP_REQUIRED', title: '注册并安装 GitHub App', detail: '登录、私有仓库和持续事件接收需要工作台自己的只读 GitHub App。' });
  if (!config.cronSecret) setupIssues.push({ code: 'SCHEDULER_REQUIRED', title: '连接后台定时任务', detail: '需要浏览器之外的调度器调用 /api/cron，执行补偿同步和失败重试。' });
  config.setupIssues = setupIssues;
  config.configured = setupIssues.length === 0;
  return config;
}
