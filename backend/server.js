const crearUsuarioMaestro = async () => {
  try {
    const passwordHash = await bcrypt.hash("123", 10);

    const [usuarios] = await sequelize.query(`
      SELECT "id", "username", "rol"
      FROM "Usuarios"
      WHERE "username" = 'gaston'
      LIMIT 1;
    `);

    if (usuarios.length > 0) {
      await sequelize.query(
        `
        UPDATE "Usuarios"
        SET "rol" = 'OWNER',
            "nombre" = COALESCE("nombre", 'Gastón Muñoz'),
            "password" = :password,
            "activo" = true,
            "updatedAt" = NOW()
        WHERE "username" = 'gaston';
        `,
        {
          replacements: {
            password: passwordHash,
          },
        }
      );

      console.log("ℹ️ Usuario gaston actualizado como OWNER y password reseteada a 123");
      return;
    }

    await sequelize.query(
      `
      INSERT INTO "Usuarios"
        ("id", "nombre", "username", "password", "rol", "activo", "createdAt", "updatedAt")
      VALUES
        (:id, :nombre, :username, :password, :rol, true, NOW(), NOW());
      `,
      {
        replacements: {
          id: crypto.randomUUID(),
          nombre: "Gastón Muñoz",
          username: "gaston",
          password: passwordHash,
          rol: "OWNER",
        },
      }
    );

    console.log("🚀 ACCESO OWNER CREADO: gaston / 123");
  } catch (error) {
    console.error("❌ Error creando usuario maestro:", error);
    throw error;
  }
};