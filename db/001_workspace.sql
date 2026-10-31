-- Dedicated workspace database. No objects are exposed in Supabase public/Data API.
BEGIN;
CREATE SCHEMA IF NOT EXISTS pcw;
REVOKE ALL ON SCHEMA pcw FROM PUBLIC;
CREATE TABLE IF NOT EXISTS pcw.migrations(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS pcw.users(id uuid PRIMARY KEY, github_id bigint NOT NULL UNIQUE, login text NOT NULL, token_cipher text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS pcw.sessions(token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES pcw.users, csrf text NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS sessions_user ON pcw.sessions(user_id);
CREATE TABLE IF NOT EXISTS pcw.oauth_states(state_hash text PRIMARY KEY, purpose text NOT NULL, user_id uuid REFERENCES pcw.users, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS pcw.installations(id bigint PRIMARY KEY, user_id uuid NOT NULL REFERENCES pcw.users, account_id bigint NOT NULL, account_login text NOT NULL, status text NOT NULL DEFAULT 'active', verified_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS installations_user ON pcw.installations(user_id);
CREATE TABLE IF NOT EXISTS pcw.projects(id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES pcw.users, installation_id bigint NOT NULL REFERENCES pcw.installations, github_repo_id bigint NOT NULL, repo text NOT NULL, name text NOT NULL, private boolean NOT NULL DEFAULT false, watching boolean NOT NULL DEFAULT true, tracked_pr integer, plan_path text, source_paths jsonb NOT NULL DEFAULT '[]', notes jsonb NOT NULL DEFAULT '[]', tasks jsonb NOT NULL DEFAULT '[]', head_sha text, head_observed_at timestamptz, generation bigint NOT NULL DEFAULT 0, tracking_version integer NOT NULL DEFAULT 1, status text NOT NULL DEFAULT 'pending', last_synced_at timestamptz, last_error text, coverage jsonb NOT NULL DEFAULT '{}', snapshot jsonb, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,github_repo_id));
CREATE INDEX IF NOT EXISTS projects_user ON pcw.projects(user_id);
CREATE INDEX IF NOT EXISTS projects_installation ON pcw.projects(installation_id);
CREATE TABLE IF NOT EXISTS pcw.deliveries(id text PRIMARY KEY, installation_id bigint, event_type text NOT NULL, action text, body_hash text NOT NULL, payload jsonb NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), status text NOT NULL DEFAULT 'received', error_code text);
CREATE INDEX IF NOT EXISTS deliveries_installation ON pcw.deliveries(installation_id,received_at);
CREATE TABLE IF NOT EXISTS pcw.evidence(id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES pcw.users, project_id uuid NOT NULL REFERENCES pcw.projects, source_key text NOT NULL, content_hash text NOT NULL, kind text NOT NULL, source_url text NOT NULL, sha text, occurred_at timestamptz, observed_at timestamptz NOT NULL DEFAULT now(), complete boolean NOT NULL DEFAULT true, author text, author_association text, data jsonb NOT NULL, UNIQUE(project_id,source_key,content_hash));
CREATE INDEX IF NOT EXISTS evidence_project_time ON pcw.evidence(project_id,occurred_at DESC,observed_at DESC);
CREATE INDEX IF NOT EXISTS evidence_user ON pcw.evidence(user_id);
CREATE INDEX IF NOT EXISTS evidence_source ON pcw.evidence(project_id,source_key,occurred_at DESC);
CREATE TABLE IF NOT EXISTS pcw.jobs(id uuid PRIMARY KEY, user_id uuid REFERENCES pcw.users, project_id uuid REFERENCES pcw.projects, kind text NOT NULL CHECK(kind IN ('sync','analyze')), dedupe_key text NOT NULL UNIQUE, payload jsonb NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','succeeded','dead')), attempts integer NOT NULL DEFAULT 0, max_attempts integer NOT NULL DEFAULT 5, available_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, lease_token uuid, last_error text, created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz);
CREATE INDEX IF NOT EXISTS jobs_ready ON pcw.jobs(status,available_at,lease_until);
CREATE INDEX IF NOT EXISTS jobs_project ON pcw.jobs(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_user ON pcw.jobs(user_id);
CREATE TABLE IF NOT EXISTS pcw.providers(id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES pcw.users, config jsonb NOT NULL, key_cipher text, version integer NOT NULL DEFAULT 1, status text NOT NULL DEFAULT 'unverified', verified_at timestamptz, last_error text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS providers_user ON pcw.providers(user_id);
CREATE TABLE IF NOT EXISTS pcw.usage(id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES pcw.users, provider_id uuid NOT NULL REFERENCES pcw.providers, provider_version integer NOT NULL, project_id uuid REFERENCES pcw.projects, purpose text NOT NULL, config_snapshot jsonb NOT NULL DEFAULT '{}', currency text NOT NULL, reserved_micros bigint NOT NULL CHECK(reserved_micros >= 0), charged_micros bigint CHECK(charged_micros >= 0), status text NOT NULL DEFAULT 'reserved', usage jsonb, request_id text, error_code text, created_at timestamptz NOT NULL DEFAULT now(), settled_at timestamptz, dispatched_at timestamptz);
CREATE INDEX IF NOT EXISTS usage_budget ON pcw.usage(provider_id,created_at);
CREATE INDEX IF NOT EXISTS usage_user ON pcw.usage(user_id);
CREATE INDEX IF NOT EXISTS usage_project ON pcw.usage(project_id);
CREATE TABLE IF NOT EXISTS pcw.analysis_attempts(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES pcw.users,project_id uuid NOT NULL REFERENCES pcw.projects,generation bigint NOT NULL,provider_id uuid NOT NULL REFERENCES pcw.providers,provider_version integer NOT NULL,retry_key text NOT NULL DEFAULT 'automatic',job_id uuid REFERENCES pcw.jobs,lease_token uuid,usage_id uuid REFERENCES pcw.usage,status text NOT NULL DEFAULT 'reserved',created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(project_id,generation,provider_id,provider_version,retry_key));
CREATE INDEX IF NOT EXISTS analysis_attempts_user ON pcw.analysis_attempts(user_id);
CREATE INDEX IF NOT EXISTS analysis_attempts_usage ON pcw.analysis_attempts(usage_id);
CREATE TABLE IF NOT EXISTS pcw.analyses(id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES pcw.users, project_id uuid NOT NULL REFERENCES pcw.projects, generation bigint NOT NULL, head_sha text, input_hash text NOT NULL, evidence_ids jsonb NOT NULL, result jsonb NOT NULL, provider_id uuid REFERENCES pcw.providers, usage_id uuid REFERENCES pcw.usage, status text NOT NULL CHECK(status IN ('current','superseded','needs_review')), created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS analyses_project ON pcw.analyses(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS analyses_user ON pcw.analyses(user_id);
CREATE TABLE IF NOT EXISTS pcw.attention(id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES pcw.users, project_id uuid NOT NULL REFERENCES pcw.projects, analysis_id uuid REFERENCES pcw.analyses, action_key text NOT NULL, claim jsonb NOT NULL, status text NOT NULL DEFAULT 'open', needs_review boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(project_id,action_key));
CREATE INDEX IF NOT EXISTS attention_user ON pcw.attention(user_id);
CREATE INDEX IF NOT EXISTS attention_project ON pcw.attention(project_id);
CREATE TABLE IF NOT EXISTS pcw.resolutions(id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES pcw.users, attention_id uuid NOT NULL REFERENCES pcw.attention, status text NOT NULL CHECK(status IN ('handled','snoozed','delegated')), note text NOT NULL, snoozed_until timestamptz, scope text NOT NULL DEFAULT 'workspace-only' CHECK(scope='workspace-only'), created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS resolutions_attention ON pcw.resolutions(attention_id,created_at DESC);
CREATE INDEX IF NOT EXISTS resolutions_user ON pcw.resolutions(user_id);
CREATE TABLE IF NOT EXISTS pcw.audit(id uuid PRIMARY KEY, user_id uuid REFERENCES pcw.users, action text NOT NULL, entity_id text, detail jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS audit_user ON pcw.audit(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS pcw.heartbeats(name text PRIMARY KEY, last_at timestamptz NOT NULL, detail jsonb NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS pcw.rate_limits(key text PRIMARY KEY, window_start timestamptz NOT NULL, count integer NOT NULL);
-- FORCE RLS also protects table-owner application connections. The runtime role must not be superuser/BYPASSRLS.
-- A separate server-only worker connection uses pcw.worker=on in a transaction; never grant direct client DB access.
DO $body$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','sessions','oauth_states','installations','projects','deliveries','evidence','jobs','providers','usage','analyses','analysis_attempts','attention','resolutions','audit','heartbeats','rate_limits','migrations'] LOOP
    EXECUTE format('ALTER TABLE pcw.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE pcw.%I FORCE ROW LEVEL SECURITY', t);
    IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='pcw' AND tablename=t AND policyname='server_worker') THEN
      EXECUTE format('CREATE POLICY server_worker ON pcw.%I USING (current_setting(''pcw.worker'',true)=''on'') WITH CHECK (current_setting(''pcw.worker'',true)=''on'')',t);
    END IF;
  END LOOP;
  FOREACH t IN ARRAY ARRAY['sessions','installations','projects','evidence','jobs','providers','usage','analyses','analysis_attempts','attention','resolutions','audit'] LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='pcw' AND tablename=t AND policyname='user_owner') THEN
      EXECUTE format('CREATE POLICY user_owner ON pcw.%I USING (user_id::text=current_setting(''pcw.user_id'',true)) WITH CHECK (user_id::text=current_setting(''pcw.user_id'',true))',t);
    END IF;
  END LOOP;
END $body$;
-- Supabase's public roles cannot reach this schema, including any future tables/functions.
REVOKE ALL ON ALL TABLES IN SCHEMA pcw FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA pcw REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA pcw REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
SELECT set_config('pcw.worker','on',true);
INSERT INTO pcw.migrations(version) VALUES('001_workspace') ON CONFLICT DO NOTHING;
COMMIT;
DO $body$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pcw_app') THEN CREATE ROLE pcw_app NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
END $body$;
GRANT USAGE ON SCHEMA pcw TO pcw_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA pcw TO pcw_app;
REVOKE UPDATE,DELETE ON pcw.evidence,pcw.audit,pcw.resolutions FROM pcw_app;
-- The deployment login is granted pcw_app by the migration operator; it receives no public Data API access.
