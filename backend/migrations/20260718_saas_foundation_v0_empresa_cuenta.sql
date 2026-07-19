BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS empresa_cuentas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  razon_social VARCHAR(255) NULL,
  rut VARCHAR(255) NULL,
  estado VARCHAR(255) NOT NULL DEFAULT 'ACTIVA',
  plan VARCHAR(255) NOT NULL DEFAULT 'INTERNO',
  timezone VARCHAR(255) DEFAULT 'America/Santiago',
  moneda VARCHAR(255) DEFAULT 'CLP',
  idioma VARCHAR(255) DEFAULT 'es',
  branding JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  storage_prefix VARCHAR(255) NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT empresa_cuentas_estado_check
    CHECK (estado IN ('TRIAL', 'ACTIVA', 'SUSPENDIDA', 'CANCELADA')),
  CONSTRAINT empresa_cuentas_plan_check
    CHECK (plan IN ('INTERNO', 'STARTER', 'PRO', 'MASTER', 'ENTERPRISE'))
);

ALTER TABLE empresa_cuentas
  ALTER COLUMN id SET DEFAULT uuid_generate_v4();

CREATE UNIQUE INDEX IF NOT EXISTS idx_empresa_cuentas_slug
  ON empresa_cuentas (slug);

INSERT INTO empresa_cuentas (
  id,
  nombre,
  slug,
  plan,
  estado,
  timezone,
  moneda,
  idioma,
  branding,
  settings,
  "createdAt",
  "updatedAt"
)
VALUES (
  uuid_generate_v4(),
  'Gmtch Tune',
  'gmtch',
  'INTERNO',
  'ACTIVA',
  'America/Santiago',
  'CLP',
  'es',
  '{}'::jsonb,
  '{}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE IF EXISTS "Usuarios"
  ADD COLUMN IF NOT EXISTS "empresaId" UUID NULL;

DO $$
BEGIN
  IF to_regclass('"Usuarios"') IS NOT NULL THEN
    UPDATE "Usuarios" AS usuario
    SET "empresaId" = empresa.id
    FROM empresa_cuentas AS empresa
    WHERE empresa.slug = 'gmtch'
      AND usuario."empresaId" IS NULL;

    CREATE INDEX IF NOT EXISTS "idx_usuarios_empresaId"
      ON "Usuarios" ("empresaId");

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'fk_usuarios_empresa_cuenta'
        AND conrelid = '"Usuarios"'::regclass
    ) THEN
      ALTER TABLE "Usuarios"
        ADD CONSTRAINT fk_usuarios_empresa_cuenta
        FOREIGN KEY ("empresaId")
        REFERENCES empresa_cuentas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;
    END IF;
  END IF;
END
$$;

COMMIT;

-- Verificacion posterior a la migracion:
-- SELECT slug, id FROM empresa_cuentas WHERE slug = 'gmtch';
-- SELECT COUNT(*) FROM "Usuarios" WHERE "empresaId" IS NULL;
