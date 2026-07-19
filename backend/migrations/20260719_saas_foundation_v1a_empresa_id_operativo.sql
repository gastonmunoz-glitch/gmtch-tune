BEGIN;

-- V1A solo puede ejecutarse mientras Gmtch sea el unico tenant.
DO $$
DECLARE
  cantidad_gmtch INTEGER;
  tabla_requerida TEXT;
BEGIN
  SELECT COUNT(*)
  INTO cantidad_gmtch
  FROM empresa_cuentas
  WHERE slug = 'gmtch';

  IF cantidad_gmtch <> 1 THEN
    RAISE EXCEPTION
      'SaaS Foundation V1A requiere exactamente una EmpresaCuenta con slug gmtch';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM empresa_cuentas
    WHERE slug <> 'gmtch'
  ) THEN
    RAISE EXCEPTION
      'SaaS Foundation V1A no puede ejecutarse si existe otro tenant distinto de gmtch';
  END IF;

  FOREACH tabla_requerida IN ARRAY ARRAY[
    'clientes',
    'vehiculos',
    'ordenes_trabajo',
    'diagnosticos',
    'fotos_vehiculo',
    'archivos_ecu',
    'orden_servicio_items',
    'materiales_recuperados',
    'orden_eventos_operativos',
    'conversaciones',
    'mensajes_conversacion',
    'notificaciones'
  ]
  LOOP
    IF to_regclass(format('public.%I', tabla_requerida)) IS NULL THEN
      RAISE EXCEPTION 'Falta la tabla requerida public.%', tabla_requerida;
    END IF;
  END LOOP;
END
$$;

ALTER TABLE "clientes"
  ADD COLUMN IF NOT EXISTS "empresaId" UUID NULL;
ALTER TABLE "clientes"
  ALTER COLUMN "empresaId" DROP NOT NULL;

ALTER TABLE "vehiculos"
  ADD COLUMN IF NOT EXISTS "empresaId" UUID NULL;
ALTER TABLE "vehiculos"
  ALTER COLUMN "empresaId" DROP NOT NULL;

ALTER TABLE "ordenes_trabajo"
  ADD COLUMN IF NOT EXISTS "empresaId" UUID NULL;
ALTER TABLE "ordenes_trabajo"
  ALTER COLUMN "empresaId" DROP NOT NULL;

ALTER TABLE "diagnosticos"
  ADD COLUMN IF NOT EXISTS "empresaId" UUID NULL;
ALTER TABLE "diagnosticos"
  ALTER COLUMN "empresaId" DROP NOT NULL;

ALTER TABLE "fotos_vehiculo"
  ADD COLUMN IF NOT EXISTS "empresaId" UUID NULL;
ALTER TABLE "fotos_vehiculo"
  ALTER COLUMN "empresaId" DROP NOT NULL;

ALTER TABLE "archivos_ecu"
  ADD COLUMN IF NOT EXISTS "empresaId" UUID NULL;
ALTER TABLE "archivos_ecu"
  ALTER COLUMN "empresaId" DROP NOT NULL;

ALTER TABLE "orden_servicio_items"
  ADD COLUMN IF NOT EXISTS "empresaId" UUID NULL;
ALTER TABLE "orden_servicio_items"
  ALTER COLUMN "empresaId" DROP NOT NULL;

ALTER TABLE "materiales_recuperados"
  ADD COLUMN IF NOT EXISTS "empresaId" UUID NULL;
ALTER TABLE "materiales_recuperados"
  ALTER COLUMN "empresaId" DROP NOT NULL;

ALTER TABLE "orden_eventos_operativos"
  ADD COLUMN IF NOT EXISTS "empresaId" UUID NULL;
ALTER TABLE "orden_eventos_operativos"
  ALTER COLUMN "empresaId" DROP NOT NULL;

ALTER TABLE "conversaciones"
  ADD COLUMN IF NOT EXISTS "empresaId" UUID NULL;
ALTER TABLE "conversaciones"
  ALTER COLUMN "empresaId" DROP NOT NULL;

ALTER TABLE "mensajes_conversacion"
  ADD COLUMN IF NOT EXISTS "empresaId" UUID NULL;
ALTER TABLE "mensajes_conversacion"
  ALTER COLUMN "empresaId" DROP NOT NULL;

ALTER TABLE "notificaciones"
  ADD COLUMN IF NOT EXISTS "empresaId" UUID NULL;
ALTER TABLE "notificaciones"
  ALTER COLUMN "empresaId" DROP NOT NULL;

-- ADD COLUMN IF NOT EXISTS no corrige una columna preexistente con otro tipo.
DO $$
DECLARE
  tabla_operativa TEXT;
  tipo_empresa_id TEXT;
  empresa_id_nullable TEXT;
BEGIN
  FOREACH tabla_operativa IN ARRAY ARRAY[
    'clientes',
    'vehiculos',
    'ordenes_trabajo',
    'diagnosticos',
    'fotos_vehiculo',
    'archivos_ecu',
    'orden_servicio_items',
    'materiales_recuperados',
    'orden_eventos_operativos',
    'conversaciones',
    'mensajes_conversacion',
    'notificaciones'
  ]
  LOOP
    SELECT udt_name, is_nullable
    INTO tipo_empresa_id, empresa_id_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = tabla_operativa
      AND column_name = 'empresaId';

    IF tipo_empresa_id IS DISTINCT FROM 'uuid'
      OR empresa_id_nullable IS DISTINCT FROM 'YES' THEN
      RAISE EXCEPTION
        'La columna %.empresaId debe ser UUID NULL y actualmente es % nullable=%',
        tabla_operativa,
        COALESCE(tipo_empresa_id, 'inexistente'),
        COALESCE(empresa_id_nullable, 'desconocido');
    END IF;
  END LOOP;
END
$$;

-- Libera los locks de esquema antes del backfill y la creacion de indices.
COMMIT;

BEGIN;

DO $$
DECLARE
  gmtch_id UUID;
  tabla_operativa TEXT;
  cantidad_nulos BIGINT;
  cantidad_invalidos BIGINT;
BEGIN
  SELECT id
  INTO STRICT gmtch_id
  FROM empresa_cuentas
  WHERE slug = 'gmtch';

  IF EXISTS (
    SELECT 1
    FROM empresa_cuentas
    WHERE slug <> 'gmtch'
  ) THEN
    RAISE EXCEPTION
      'SaaS Foundation V1A no puede continuar si existe otro tenant distinto de gmtch';
  END IF;

  -- Raiz operativa.
  UPDATE "clientes"
  SET "empresaId" = gmtch_id
  WHERE "empresaId" IS NULL;

  -- Vehiculos heredan desde cliente y los huerfanos quedan en Gmtch.
  UPDATE "vehiculos" AS vehiculo
  SET "empresaId" = COALESCE(cliente."empresaId", gmtch_id)
  FROM "clientes" AS cliente
  WHERE vehiculo."empresaId" IS NULL
    AND cliente."id" = vehiculo."clienteId";

  UPDATE "vehiculos"
  SET "empresaId" = gmtch_id
  WHERE "empresaId" IS NULL;

  -- Ordenes heredan desde vehiculo y los huerfanos quedan en Gmtch.
  UPDATE "ordenes_trabajo" AS orden
  SET "empresaId" = COALESCE(vehiculo."empresaId", gmtch_id)
  FROM "vehiculos" AS vehiculo
  WHERE orden."empresaId" IS NULL
    AND vehiculo."id" = orden."vehiculoId";

  UPDATE "ordenes_trabajo"
  SET "empresaId" = gmtch_id
  WHERE "empresaId" IS NULL;

  -- Hijos directos de orden. La columna fisica correcta es "ordenId".
  UPDATE "diagnosticos" AS diagnostico
  SET "empresaId" = COALESCE(orden."empresaId", gmtch_id)
  FROM "ordenes_trabajo" AS orden
  WHERE diagnostico."empresaId" IS NULL
    AND orden."id" = diagnostico."ordenId";

  UPDATE "diagnosticos"
  SET "empresaId" = gmtch_id
  WHERE "empresaId" IS NULL;

  UPDATE "fotos_vehiculo" AS foto
  SET "empresaId" = COALESCE(orden."empresaId", gmtch_id)
  FROM "ordenes_trabajo" AS orden
  WHERE foto."empresaId" IS NULL
    AND orden."id" = foto."ordenId";

  UPDATE "fotos_vehiculo"
  SET "empresaId" = gmtch_id
  WHERE "empresaId" IS NULL;

  UPDATE "archivos_ecu" AS archivo
  SET "empresaId" = COALESCE(orden."empresaId", gmtch_id)
  FROM "ordenes_trabajo" AS orden
  WHERE archivo."empresaId" IS NULL
    AND orden."id" = archivo."ordenId";

  UPDATE "archivos_ecu"
  SET "empresaId" = gmtch_id
  WHERE "empresaId" IS NULL;

  UPDATE "orden_servicio_items" AS item
  SET "empresaId" = COALESCE(orden."empresaId", gmtch_id)
  FROM "ordenes_trabajo" AS orden
  WHERE item."empresaId" IS NULL
    AND orden."id" = item."ordenId";

  UPDATE "orden_servicio_items"
  SET "empresaId" = gmtch_id
  WHERE "empresaId" IS NULL;

  UPDATE "orden_eventos_operativos" AS evento
  SET "empresaId" = COALESCE(orden."empresaId", gmtch_id)
  FROM "ordenes_trabajo" AS orden
  WHERE evento."empresaId" IS NULL
    AND orden."id" = evento."ordenId";

  UPDATE "orden_eventos_operativos"
  SET "empresaId" = gmtch_id
  WHERE "empresaId" IS NULL;

  -- Material recuperado: orden, item, vehiculo, cliente y fallback Gmtch.
  UPDATE "materiales_recuperados" AS material
  SET "empresaId" = COALESCE(orden."empresaId", gmtch_id)
  FROM "ordenes_trabajo" AS orden
  WHERE material."empresaId" IS NULL
    AND orden."id" = material."ordenId";

  UPDATE "materiales_recuperados" AS material
  SET "empresaId" = COALESCE(item."empresaId", gmtch_id)
  FROM "orden_servicio_items" AS item
  WHERE material."empresaId" IS NULL
    AND item."id" = material."itemId";

  UPDATE "materiales_recuperados" AS material
  SET "empresaId" = COALESCE(vehiculo."empresaId", gmtch_id)
  FROM "vehiculos" AS vehiculo
  WHERE material."empresaId" IS NULL
    AND vehiculo."id" = material."vehiculoId";

  UPDATE "materiales_recuperados" AS material
  SET "empresaId" = COALESCE(cliente."empresaId", gmtch_id)
  FROM "clientes" AS cliente
  WHERE material."empresaId" IS NULL
    AND cliente."id" = material."clienteId";

  UPDATE "materiales_recuperados"
  SET "empresaId" = gmtch_id
  WHERE "empresaId" IS NULL;

  -- Conversaciones pertenecen a la empresa del usuario interno asignado.
  -- No se relaciona Conversacion.clienteId con clientes: sus tipos no coinciden.
  UPDATE "conversaciones" AS conversacion
  SET "empresaId" = COALESCE(usuario."empresaId", gmtch_id)
  FROM "Usuarios" AS usuario
  WHERE conversacion."empresaId" IS NULL
    AND usuario."id" = conversacion."asignado_a_id";

  UPDATE "conversaciones"
  SET "empresaId" = gmtch_id
  WHERE "empresaId" IS NULL;

  UPDATE "mensajes_conversacion" AS mensaje
  SET "empresaId" = COALESCE(conversacion."empresaId", gmtch_id)
  FROM "conversaciones" AS conversacion
  WHERE mensaje."empresaId" IS NULL
    AND conversacion."id" = mensaje."conversacionId";

  UPDATE "mensajes_conversacion"
  SET "empresaId" = gmtch_id
  WHERE "empresaId" IS NULL;

  -- Notificaciones: orden, Archivo ECU y fallback Gmtch.
  UPDATE "notificaciones" AS notificacion
  SET "empresaId" = COALESCE(orden."empresaId", gmtch_id)
  FROM "ordenes_trabajo" AS orden
  WHERE notificacion."empresaId" IS NULL
    AND orden."id" = notificacion."ordenId";

  UPDATE "notificaciones" AS notificacion
  SET "empresaId" = COALESCE(archivo."empresaId", gmtch_id)
  FROM "archivos_ecu" AS archivo
  WHERE notificacion."empresaId" IS NULL
    AND archivo."id" = notificacion."archivoECUId";

  UPDATE "notificaciones"
  SET "empresaId" = gmtch_id
  WHERE "empresaId" IS NULL;

  -- La migracion no sobrescribe tenants existentes y exige referencias validas.
  FOREACH tabla_operativa IN ARRAY ARRAY[
    'clientes',
    'vehiculos',
    'ordenes_trabajo',
    'diagnosticos',
    'fotos_vehiculo',
    'archivos_ecu',
    'orden_servicio_items',
    'materiales_recuperados',
    'orden_eventos_operativos',
    'conversaciones',
    'mensajes_conversacion',
    'notificaciones'
  ]
  LOOP
    EXECUTE format(
      'SELECT COUNT(*) FROM %I WHERE "empresaId" IS NULL',
      tabla_operativa
    ) INTO cantidad_nulos;

    IF cantidad_nulos > 0 THEN
      RAISE EXCEPTION
        'Quedaron % filas sin empresaId en %', cantidad_nulos, tabla_operativa;
    END IF;

    EXECUTE format(
      'SELECT COUNT(*) FROM %I AS registro '
      'LEFT JOIN empresa_cuentas AS empresa ON empresa.id = registro."empresaId" '
      'WHERE registro."empresaId" IS NOT NULL AND empresa.id IS NULL',
      tabla_operativa
    ) INTO cantidad_invalidos;

    IF cantidad_invalidos > 0 THEN
      RAISE EXCEPTION
        'Existen % referencias empresaId invalidas en %',
        cantidad_invalidos,
        tabla_operativa;
    END IF;
  END LOOP;
END
$$;

-- Finaliza el backfill antes de construir indices o validar FKs.
COMMIT;

CREATE INDEX IF NOT EXISTS "idx_clientes_empresaId"
  ON "clientes" ("empresaId");

CREATE INDEX IF NOT EXISTS "idx_vehiculos_empresa_cliente"
  ON "vehiculos" ("empresaId", "clienteId");

CREATE INDEX IF NOT EXISTS "idx_ordenes_trabajo_empresa_vehiculo"
  ON "ordenes_trabajo" ("empresaId", "vehiculoId");

CREATE INDEX IF NOT EXISTS "idx_diagnosticos_empresa_orden"
  ON "diagnosticos" ("empresaId", "ordenId");

CREATE INDEX IF NOT EXISTS "idx_fotos_vehiculo_empresa_orden"
  ON "fotos_vehiculo" ("empresaId", "ordenId");

CREATE INDEX IF NOT EXISTS "idx_archivos_ecu_empresa_orden"
  ON "archivos_ecu" ("empresaId", "ordenId");

CREATE INDEX IF NOT EXISTS "idx_orden_servicio_items_empresa_orden"
  ON "orden_servicio_items" ("empresaId", "ordenId");

CREATE INDEX IF NOT EXISTS "idx_materiales_recuperados_empresa_orden"
  ON "materiales_recuperados" ("empresaId", "ordenId");

CREATE INDEX IF NOT EXISTS "idx_orden_eventos_empresa_orden"
  ON "orden_eventos_operativos" ("empresaId", "ordenId");

CREATE INDEX IF NOT EXISTS "idx_conversaciones_empresa_ultimo_mensaje"
  ON "conversaciones" ("empresaId", "ultimo_mensaje_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_mensajes_conversacion_empresa_conversacion"
  ON "mensajes_conversacion" ("empresaId", "conversacionId", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_notificaciones_empresa_fecha"
  ON "notificaciones" ("empresaId", "createdAt" DESC);

-- FKs idempotentes. NOT VALID reduce el bloqueo inicial; luego se validan.
DO $$
DECLARE
  tablas TEXT[] := ARRAY[
    'clientes',
    'vehiculos',
    'ordenes_trabajo',
    'diagnosticos',
    'fotos_vehiculo',
    'archivos_ecu',
    'orden_servicio_items',
    'materiales_recuperados',
    'orden_eventos_operativos',
    'conversaciones',
    'mensajes_conversacion',
    'notificaciones'
  ];
  restricciones TEXT[] := ARRAY[
    'fk_clientes_empresa_cuenta',
    'fk_vehiculos_empresa_cuenta',
    'fk_ordenes_trabajo_empresa_cuenta',
    'fk_diagnosticos_empresa_cuenta',
    'fk_fotos_vehiculo_empresa_cuenta',
    'fk_archivos_ecu_empresa_cuenta',
    'fk_orden_servicio_items_empresa_cuenta',
    'fk_materiales_recuperados_empresa_cuenta',
    'fk_orden_eventos_operativos_empresa_cuenta',
    'fk_conversaciones_empresa_cuenta',
    'fk_mensajes_conversacion_empresa_cuenta',
    'fk_notificaciones_empresa_cuenta'
  ];
  indice INTEGER;
BEGIN
  FOR indice IN 1..array_length(tablas, 1)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = restricciones[indice]
        AND conrelid = to_regclass(format('public.%I', tablas[indice]))
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I '
        'FOREIGN KEY ("empresaId") REFERENCES empresa_cuentas (id) '
        'ON UPDATE CASCADE ON DELETE RESTRICT NOT VALID',
        tablas[indice],
        restricciones[indice]
      );
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = restricciones[indice]
        AND conrelid = to_regclass(format('public.%I', tablas[indice]))
        AND NOT convalidated
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I VALIDATE CONSTRAINT %I',
        tablas[indice],
        restricciones[indice]
      );
    END IF;
  END LOOP;
END
$$;

-- Verificacion: columnas creadas.
-- SELECT table_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND column_name = 'empresaId'
-- ORDER BY table_name;

-- Verificacion: conteo de nulos por tabla.
-- SELECT *
-- FROM (
--   VALUES
--     ('clientes', (SELECT COUNT(*) FROM "clientes" WHERE "empresaId" IS NULL)),
--     ('vehiculos', (SELECT COUNT(*) FROM "vehiculos" WHERE "empresaId" IS NULL)),
--     ('ordenes_trabajo', (SELECT COUNT(*) FROM "ordenes_trabajo" WHERE "empresaId" IS NULL)),
--     ('diagnosticos', (SELECT COUNT(*) FROM "diagnosticos" WHERE "empresaId" IS NULL)),
--     ('fotos_vehiculo', (SELECT COUNT(*) FROM "fotos_vehiculo" WHERE "empresaId" IS NULL)),
--     ('archivos_ecu', (SELECT COUNT(*) FROM "archivos_ecu" WHERE "empresaId" IS NULL)),
--     ('orden_servicio_items', (SELECT COUNT(*) FROM "orden_servicio_items" WHERE "empresaId" IS NULL)),
--     ('materiales_recuperados', (SELECT COUNT(*) FROM "materiales_recuperados" WHERE "empresaId" IS NULL)),
--     ('orden_eventos_operativos', (SELECT COUNT(*) FROM "orden_eventos_operativos" WHERE "empresaId" IS NULL)),
--     ('conversaciones', (SELECT COUNT(*) FROM "conversaciones" WHERE "empresaId" IS NULL)),
--     ('mensajes_conversacion', (SELECT COUNT(*) FROM "mensajes_conversacion" WHERE "empresaId" IS NULL)),
--     ('notificaciones', (SELECT COUNT(*) FROM "notificaciones" WHERE "empresaId" IS NULL))
-- ) AS revision(tabla, nulos);

-- Verificacion: consistencia ordenes vs vehiculos.
-- SELECT COUNT(*) AS ordenes_inconsistentes
-- FROM "ordenes_trabajo" AS orden
-- JOIN "vehiculos" AS vehiculo ON vehiculo."id" = orden."vehiculoId"
-- WHERE orden."empresaId" IS DISTINCT FROM vehiculo."empresaId";

-- Verificacion: consistencia archivos ECU vs ordenes.
-- SELECT COUNT(*) AS archivos_inconsistentes
-- FROM "archivos_ecu" AS archivo
-- JOIN "ordenes_trabajo" AS orden ON orden."id" = archivo."ordenId"
-- WHERE archivo."empresaId" IS DISTINCT FROM orden."empresaId";

-- Verificacion: consistencia mensajes vs conversaciones.
-- SELECT COUNT(*) AS mensajes_inconsistentes
-- FROM "mensajes_conversacion" AS mensaje
-- JOIN "conversaciones" AS conversacion
--   ON conversacion."id" = mensaje."conversacionId"
-- WHERE mensaje."empresaId" IS DISTINCT FROM conversacion."empresaId";
