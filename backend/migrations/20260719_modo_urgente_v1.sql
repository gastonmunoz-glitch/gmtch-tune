-- Gmtch Tune OS - Modo Urgente / Flujo Rapido V1
-- Migracion explicita e idempotente para PostgreSQL / Railway.
-- No habilita el modo urgente por si sola: los registros existentes quedan normales.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.ordenes_trabajo') IS NULL THEN
    RAISE EXCEPTION 'Falta la tabla public.ordenes_trabajo';
  END IF;

  IF to_regclass('public.archivos_ecu') IS NULL THEN
    RAISE EXCEPTION 'Falta la tabla public.archivos_ecu';
  END IF;
END
$$;

ALTER TABLE "ordenes_trabajo"
  ADD COLUMN IF NOT EXISTS "creado_en_modo_urgente" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "motivo_urgencia" TEXT,
  ADD COLUMN IF NOT EXISTS "requiere_regularizacion" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "regularizacion_pendientes" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "regularizar_antes_de_entrega" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "urgente_creado_por" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "urgente_creado_at" TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS "regularizado_por" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "regularizado_at" TIMESTAMP WITH TIME ZONE;

ALTER TABLE "archivos_ecu"
  ADD COLUMN IF NOT EXISTS "creado_en_modo_urgente" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "motivo_urgencia" TEXT,
  ADD COLUMN IF NOT EXISTS "requiere_regularizacion" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "regularizacion_pendientes" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "regularizar_antes_de_entrega" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "urgente_creado_por" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "urgente_creado_at" TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS "regularizado_por" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "regularizado_at" TIMESTAMP WITH TIME ZONE;

-- Si hubo un rollout manual previo, fallar con mensaje claro antes de tocar datos.
DO $$
DECLARE
  revision RECORD;
  tipo_actual TEXT;
BEGIN
  FOR revision IN
    SELECT *
    FROM (VALUES
      ('creado_en_modo_urgente', 'boolean'),
      ('motivo_urgencia', 'text'),
      ('requiere_regularizacion', 'boolean'),
      ('regularizacion_pendientes', 'jsonb'),
      ('regularizar_antes_de_entrega', 'boolean'),
      ('urgente_creado_por', 'character varying'),
      ('urgente_creado_at', 'timestamp with time zone'),
      ('regularizado_por', 'character varying'),
      ('regularizado_at', 'timestamp with time zone')
    ) AS esperados(columna, tipo)
  LOOP
    SELECT c.data_type
    INTO tipo_actual
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'ordenes_trabajo'
      AND c.column_name = revision.columna;

    IF tipo_actual IS DISTINCT FROM revision.tipo THEN
      RAISE EXCEPTION 'Tipo inesperado en ordenes_trabajo.%: esperado %, actual %',
        revision.columna, revision.tipo, COALESCE(tipo_actual, 'ausente');
    END IF;

    SELECT c.data_type
    INTO tipo_actual
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'archivos_ecu'
      AND c.column_name = revision.columna;

    IF tipo_actual IS DISTINCT FROM revision.tipo THEN
      RAISE EXCEPTION 'Tipo inesperado en archivos_ecu.%: esperado %, actual %',
        revision.columna, revision.tipo, COALESCE(tipo_actual, 'ausente');
    END IF;
  END LOOP;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ordenes_trabajo"
    WHERE "regularizacion_pendientes" IS NOT NULL
      AND jsonb_typeof("regularizacion_pendientes") <> 'array'
  ) THEN
    RAISE EXCEPTION 'ordenes_trabajo.regularizacion_pendientes debe contener arreglos JSON';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "archivos_ecu"
    WHERE "regularizacion_pendientes" IS NOT NULL
      AND jsonb_typeof("regularizacion_pendientes") <> 'array'
  ) THEN
    RAISE EXCEPTION 'archivos_ecu.regularizacion_pendientes debe contener arreglos JSON';
  END IF;
END
$$;

UPDATE "ordenes_trabajo"
SET
  "creado_en_modo_urgente" = COALESCE("creado_en_modo_urgente", false),
  "requiere_regularizacion" = COALESCE("requiere_regularizacion", false),
  "regularizacion_pendientes" = COALESCE("regularizacion_pendientes", '[]'::jsonb),
  "regularizar_antes_de_entrega" = COALESCE("regularizar_antes_de_entrega", false)
WHERE
  "creado_en_modo_urgente" IS NULL
  OR "requiere_regularizacion" IS NULL
  OR "regularizacion_pendientes" IS NULL
  OR "regularizar_antes_de_entrega" IS NULL;

UPDATE "archivos_ecu"
SET
  "creado_en_modo_urgente" = COALESCE("creado_en_modo_urgente", false),
  "requiere_regularizacion" = COALESCE("requiere_regularizacion", false),
  "regularizacion_pendientes" = COALESCE("regularizacion_pendientes", '[]'::jsonb),
  "regularizar_antes_de_entrega" = COALESCE("regularizar_antes_de_entrega", false)
WHERE
  "creado_en_modo_urgente" IS NULL
  OR "requiere_regularizacion" IS NULL
  OR "regularizacion_pendientes" IS NULL
  OR "regularizar_antes_de_entrega" IS NULL;

ALTER TABLE "ordenes_trabajo"
  ALTER COLUMN "creado_en_modo_urgente" SET DEFAULT false,
  ALTER COLUMN "creado_en_modo_urgente" SET NOT NULL,
  ALTER COLUMN "requiere_regularizacion" SET DEFAULT false,
  ALTER COLUMN "requiere_regularizacion" SET NOT NULL,
  ALTER COLUMN "regularizacion_pendientes" SET DEFAULT '[]'::jsonb,
  ALTER COLUMN "regularizacion_pendientes" SET NOT NULL,
  ALTER COLUMN "regularizar_antes_de_entrega" SET DEFAULT false,
  ALTER COLUMN "regularizar_antes_de_entrega" SET NOT NULL;

ALTER TABLE "archivos_ecu"
  ALTER COLUMN "creado_en_modo_urgente" SET DEFAULT false,
  ALTER COLUMN "creado_en_modo_urgente" SET NOT NULL,
  ALTER COLUMN "requiere_regularizacion" SET DEFAULT false,
  ALTER COLUMN "requiere_regularizacion" SET NOT NULL,
  ALTER COLUMN "regularizacion_pendientes" SET DEFAULT '[]'::jsonb,
  ALTER COLUMN "regularizacion_pendientes" SET NOT NULL,
  ALTER COLUMN "regularizar_antes_de_entrega" SET DEFAULT false,
  ALTER COLUMN "regularizar_antes_de_entrega" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_ordenes_urgente_regularizacion"
  ON "ordenes_trabajo" ("updatedAt" DESC)
  WHERE "creado_en_modo_urgente" = true
    AND ("requiere_regularizacion" = true OR "regularizar_antes_de_entrega" = true);

CREATE INDEX IF NOT EXISTS "idx_archivos_ecu_urgente_regularizacion"
  ON "archivos_ecu" ("updatedAt" DESC)
  WHERE "creado_en_modo_urgente" = true
    AND ("requiere_regularizacion" = true OR "regularizar_antes_de_entrega" = true);

COMMIT;

-- Verificacion sugerida despues de ejecutar:
-- SELECT table_name, column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name IN ('ordenes_trabajo', 'archivos_ecu')
--   AND column_name IN (
--     'creado_en_modo_urgente', 'motivo_urgencia', 'requiere_regularizacion',
--     'regularizacion_pendientes', 'regularizar_antes_de_entrega',
--     'urgente_creado_por', 'urgente_creado_at', 'regularizado_por',
--     'regularizado_at'
--   )
-- ORDER BY table_name, ordinal_position;
--
-- SELECT
--   'ordenes_trabajo' AS tabla,
--   COUNT(*) FILTER (WHERE "creado_en_modo_urgente") AS urgentes,
--   COUNT(*) FILTER (WHERE "requiere_regularizacion") AS sin_regularizar
-- FROM "ordenes_trabajo"
-- UNION ALL
-- SELECT
--   'archivos_ecu',
--   COUNT(*) FILTER (WHERE "creado_en_modo_urgente"),
--   COUNT(*) FILTER (WHERE "requiere_regularizacion")
-- FROM "archivos_ecu";
--
-- SELECT 'ordenes_trabajo' AS tabla, id, "requiere_regularizacion",
--        "regularizar_antes_de_entrega", "regularizacion_pendientes"
-- FROM "ordenes_trabajo"
-- WHERE ("requiere_regularizacion" = false AND jsonb_array_length("regularizacion_pendientes") > 0)
--    OR ("regularizar_antes_de_entrega" = true AND "creado_en_modo_urgente" = false)
-- UNION ALL
-- SELECT 'archivos_ecu', id, "requiere_regularizacion",
--        "regularizar_antes_de_entrega", "regularizacion_pendientes"
-- FROM "archivos_ecu"
-- WHERE ("requiere_regularizacion" = false AND jsonb_array_length("regularizacion_pendientes") > 0)
--    OR ("regularizar_antes_de_entrega" = true AND "creado_en_modo_urgente" = false);
