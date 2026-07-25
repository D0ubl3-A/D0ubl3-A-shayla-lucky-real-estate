module.exports = {
  apps: [{
    name: 'shayla-lucky',
    script: './server.js',
    instances: 1,
    autorestart: true,
    max_memory_restart: '400M',
    env: { NODE_ENV: 'production', PORT: 3000 }
  }]
};
