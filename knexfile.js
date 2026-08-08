require('dotenv').config();

const shared = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  migrations: { directory: './src/database/migrations' },
  seeds: { directory: './src/database/seeds' },
};

module.exports = {
  development: shared,
  production: { ...shared, pool: { min: 2, max: 10 } },
};
