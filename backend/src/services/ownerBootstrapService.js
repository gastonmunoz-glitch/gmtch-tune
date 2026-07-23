const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { QueryTypes } = require("sequelize");
const sequelize = require("../config/database");

class OwnerBootstrapConfigError extends Error {
  constructor(codigo, message) {
    super(message);
    this.name = "OwnerBootstrapConfigError";
    this.codigo = codigo;
  }
}

const errorConfiguracion = (codigo, message) =>
  new OwnerBootstrapConfigError(codigo, message);

const validarConfiguracionBootstrap = (env = process.env) => {
  const habilitado = String(env.OWNER_BOOTSTRAP_ENABLED || "").toLowerCase() === "true";

  if (!habilitado) {
    throw errorConfiguracion(
      "OWNER_BOOTSTRAP_DESHABILITADO",
      "No existe un OWNER para la empresa principal y el bootstrap seguro no esta habilitado."
    );
  }

  const username = String(env.OWNER_INITIAL_USERNAME || "").trim();
  const password = String(env.OWNER_INITIAL_PASSWORD || "");
  const largoBytes = Buffer.byteLength(password, "utf8");
  const categorias = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((regla) =>
    regla.test(password)
  ).length;

  if (!/^[A-Za-z0-9._-]{3,60}$/.test(username)) {
    throw errorConfiguracion(
      "OWNER_BOOTSTRAP_CONFIG_INVALIDA",
      "La configuracion del bootstrap OWNER es invalida."
    );
  }

  if (
    largoBytes < 16 ||
    largoBytes > 72 ||
    categorias < 3 ||
    /^(.)\1+$/.test(password) ||
    password.toLowerCase().includes(username.toLowerCase())
  ) {
    throw errorConfiguracion(
      "OWNER_BOOTSTRAP_CONFIG_INVALIDA",
      "La configuracion del bootstrap OWNER es invalida."
    );
  }

  return { username, password };
};

const crearOwnerBootstrapService = ({
  sequelizeImpl = sequelize,
  bcryptImpl = bcrypt,
  cryptoImpl = crypto,
  queryTypes = QueryTypes,
} = {}) => {
  const asegurarOwnerInicial = async (empresaGmtch, env = process.env) => {
    const empresaId = String(empresaGmtch?.id || "").trim();
    if (!empresaId) {
      throw errorConfiguracion(
        "OWNER_BOOTSTRAP_EMPRESA_NO_DISPONIBLE",
        "La empresa principal no esta disponible para verificar el OWNER inicial."
      );
    }

    const transaction = await sequelizeImpl.transaction();

    try {
      await sequelizeImpl.query(
        "SELECT pg_advisory_xact_lock(hashtext('gmtch_owner_bootstrap_v1'));",
        { transaction }
      );

      const owners = await sequelizeImpl.query(
        `
        SELECT "id"
        FROM "Usuarios"
        WHERE "rol" = 'OWNER'
          AND "empresaId" = :empresaId
        LIMIT 1;
        `,
        {
          replacements: { empresaId },
          type: queryTypes.SELECT,
          transaction,
        }
      );

      if (owners.length > 0) {
        await transaction.commit();
        return { creado: false };
      }

      const { username, password } = validarConfiguracionBootstrap(env);

      const colision = await sequelizeImpl.query(
        `
        SELECT "id"
        FROM "Usuarios"
        WHERE lower(btrim("username")) = lower(btrim(:username))
        LIMIT 1;
        `,
        {
          replacements: { username },
          type: queryTypes.SELECT,
          transaction,
        }
      );

      if (colision.length > 0) {
        throw errorConfiguracion(
          "OWNER_BOOTSTRAP_USERNAME_OCUPADO",
          "No se pudo crear el OWNER inicial porque la identidad configurada ya existe."
        );
      }

      const passwordHash = await bcryptImpl.hash(password, 10);

      await sequelizeImpl.query(
        `
        INSERT INTO "Usuarios"
          ("id", "nombre", "username", "password", "rol", "activo", "empresaId", "createdAt", "updatedAt")
        VALUES
          ($id, 'OWNER inicial', $username, $passwordHash, 'OWNER', true, $empresaId, NOW(), NOW());
        `,
        {
          bind: {
            id: cryptoImpl.randomUUID(),
            username,
            passwordHash,
            empresaId,
          },
          transaction,
        }
      );

      await transaction.commit();
      return { creado: true };
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }

      if (error instanceof OwnerBootstrapConfigError) throw error;

      throw errorConfiguracion(
        "OWNER_BOOTSTRAP_ERROR",
        "No se pudo verificar o crear el OWNER inicial de forma segura."
      );
    }
  };

  return { asegurarOwnerInicial };
};

const { asegurarOwnerInicial } = crearOwnerBootstrapService();

module.exports = {
  OwnerBootstrapConfigError,
  asegurarOwnerInicial,
  crearOwnerBootstrapService,
  validarConfiguracionBootstrap,
};
