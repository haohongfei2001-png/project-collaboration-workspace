-- Requires 001_workspace.sql. Operational ledgers are private and retain failed/retried history.
BEGIN;
CREATE TABLE IF NOT EXISTS pcw.webhook_recovery_state (
  app_id text PRIMARY KEY,
  lease_token uuid, lease_until timestamptz,
  cursor text, seen_cursors jsonb NOT NULL DEFAULT '[]',
  scan_started_at timestamptz, scan_since_at timestamptz, scan_oldest_at timestamptz,
  ordering_trusted boolean NOT NULL DEFAULT true, pages_seen integer NOT NULL DEFAULT 0,
  last_successful_poll_at timestamptz, watermark_at timestamptz, last_page_at timestamptz,
  next_poll_at timestamptz, poll_failures integer NOT NULL DEFAULT 0,
  incomplete boolean NOT NULL DEFAULT true, retention_gap boolean NOT NULL DEFAULT false,
  gap_from timestamptz, gap_to timestamptz, last_error text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pcw.webhook_recovery_groups (
  app_id text NOT NULL REFERENCES pcw.webhook_recovery_state(app_id), guid text NOT NULL,
  user_id uuid NOT NULL REFERENCES pcw.users(id), installation_id bigint NOT NULL REFERENCES pcw.installations(id),
  repository_id bigint, event_type text NOT NULL,
  first_delivered_at timestamptz NOT NULL, latest_delivered_at timestamptz NOT NULL,
  latest_delivery_id bigint NOT NULL, provider_success_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','requested','recovered','exhausted','expired','revoked','unconfirmed')),
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
  next_attempt_at timestamptz NOT NULL, last_requested_at timestamptz,
  recovered_at timestamptz, last_error text,
  first_observed_at timestamptz NOT NULL, last_observed_at timestamptz NOT NULL,
  PRIMARY KEY(app_id,guid)
);
CREATE INDEX IF NOT EXISTS webhook_recovery_groups_ready ON pcw.webhook_recovery_groups(app_id,status,next_attempt_at);
CREATE INDEX IF NOT EXISTS webhook_recovery_groups_user ON pcw.webhook_recovery_groups(user_id);
CREATE INDEX IF NOT EXISTS webhook_recovery_groups_installation ON pcw.webhook_recovery_groups(installation_id);

CREATE TABLE IF NOT EXISTS pcw.webhook_delivery_attempts (
  app_id text NOT NULL REFERENCES pcw.webhook_recovery_state(app_id), delivery_id bigint NOT NULL,
  guid text NOT NULL, user_id uuid NOT NULL REFERENCES pcw.users(id),
  installation_id bigint NOT NULL REFERENCES pcw.installations(id), repository_id bigint,
  event_type text NOT NULL, action text, delivered_at timestamptz NOT NULL, redelivery boolean NOT NULL,
  first_status_code integer, latest_status_code integer,
  provider_succeeded boolean NOT NULL DEFAULT false,
  first_observed_at timestamptz NOT NULL, last_observed_at timestamptz NOT NULL,
  PRIMARY KEY(app_id,delivery_id), UNIQUE(app_id,guid,delivery_id)
);
CREATE INDEX IF NOT EXISTS webhook_delivery_attempts_guid ON pcw.webhook_delivery_attempts(app_id,guid,delivered_at DESC);
CREATE INDEX IF NOT EXISTS webhook_delivery_attempts_user ON pcw.webhook_delivery_attempts(user_id);
CREATE INDEX IF NOT EXISTS webhook_delivery_attempts_installation ON pcw.webhook_delivery_attempts(installation_id);

CREATE TABLE IF NOT EXISTS pcw.webhook_redelivery_requests (
  app_id text NOT NULL, guid text NOT NULL, attempt_no integer NOT NULL CHECK(attempt_no BETWEEN 1 AND 5),
  user_id uuid NOT NULL REFERENCES pcw.users(id), installation_id bigint NOT NULL REFERENCES pcw.installations(id),
  delivery_id bigint NOT NULL, lease_token uuid NOT NULL,
  outcome text NOT NULL DEFAULT 'reserved' CHECK(outcome IN ('reserved','accepted','failed','unknown')),
  requested_at timestamptz NOT NULL, finished_at timestamptz, retry_at timestamptz, error_code text,
  PRIMARY KEY(app_id,guid,attempt_no),
  FOREIGN KEY(app_id,guid) REFERENCES pcw.webhook_recovery_groups(app_id,guid)
);
CREATE INDEX IF NOT EXISTS webhook_redelivery_requests_user ON pcw.webhook_redelivery_requests(user_id);
CREATE INDEX IF NOT EXISTS webhook_redelivery_requests_installation ON pcw.webhook_redelivery_requests(installation_id);

DO $pcw_recovery$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['webhook_recovery_state','webhook_recovery_groups','webhook_delivery_attempts','webhook_redelivery_requests'] LOOP
    EXECUTE format('ALTER TABLE pcw.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('ALTER TABLE pcw.%I FORCE ROW LEVEL SECURITY',t);
    IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='pcw' AND tablename=t AND policyname='server_worker') THEN
      EXECUTE format('CREATE POLICY server_worker ON pcw.%I TO pcw_app USING (current_setting(''pcw.worker'',true)=''on'') WITH CHECK (current_setting(''pcw.worker'',true)=''on'')',t);
    END IF;
    EXECUTE format('REVOKE ALL ON pcw.%I FROM PUBLIC',t);
    EXECUTE format('GRANT SELECT,INSERT,UPDATE ON pcw.%I TO pcw_app',t);
    EXECUTE format('REVOKE DELETE ON pcw.%I FROM pcw_app',t);
  END LOOP;
END $pcw_recovery$;
SELECT set_config('pcw.worker','on',true);
INSERT INTO pcw.migrations(version) VALUES('002_delivery_recovery') ON CONFLICT DO NOTHING;
COMMIT;
