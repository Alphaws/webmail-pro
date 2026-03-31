module.exports = {
  development: {
    client: process.env.DB_CLIENT || 'pg',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'webmail',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'webmail_pro',
    },
    migrations: {
      directory: './src/database/migrations'
    }
  },
  production: {
    client: process.env.DB_CLIENT || 'pg',
    connection: {
      host: process.env.DB_HOST || 'webmail-db',
      user: process.env.DB_USER || 'webmail',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'webmail_pro',
    },
    migrations: {
      directory: './src/database/migrations'
    }
  }
};
