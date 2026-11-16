CREATE EXTENSION IF NOT EXISTS vector;

CREATE OR REPLACE FUNCTION notify_vmms_table_change()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('vmms_data_changed', TG_TABLE_NAME);
  PERFORM pg_notify(TG_TABLE_NAME || '_changed', TG_TABLE_NAME);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF to_regclass('public.vehicles') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_vehicles_notify ON public.vehicles;
    CREATE TRIGGER trg_vehicles_notify
      AFTER INSERT OR UPDATE OR DELETE ON public.vehicles
      FOR EACH STATEMENT EXECUTE FUNCTION notify_vmms_table_change();
  END IF;
  IF to_regclass('public.maintenance_schedules') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_maintenance_schedules_notify ON public.maintenance_schedules;
    CREATE TRIGGER trg_maintenance_schedules_notify
      AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_schedules
      FOR EACH STATEMENT EXECUTE FUNCTION notify_vmms_table_change();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.maintenance_embeddings (
  id UUID PRIMARY KEY,
  "scheduleId" UUID REFERENCES public.maintenance_schedules(id) ON DELETE CASCADE,
  "templateId" UUID REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  "sourceType" VARCHAR(32) NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT maintenance_embeddings_source_check CHECK (
    ("sourceType" = 'MAINTENANCE_SCHEDULE' AND "scheduleId" IS NOT NULL AND "templateId" IS NULL)
    OR
    ("sourceType" = 'CHECKLIST_TEMPLATE' AND "scheduleId" IS NULL AND "templateId" IS NOT NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS maintenance_embeddings_schedule_key ON public.maintenance_embeddings("scheduleId") WHERE "scheduleId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS maintenance_embeddings_template_key ON public.maintenance_embeddings("templateId") WHERE "templateId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS maintenance_embeddings_source_idx ON public.maintenance_embeddings("sourceType");
