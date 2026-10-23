const path = require('path');

module.exports = {
  apps: [
    {
      name: 'acco-frontend',
      script: path.resolve(__dirname, 'node_modules/next/dist/bin/next'),
      args: 'start -p 3000',
      cwd: __dirname,
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
