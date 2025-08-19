module.exports = {
  apps: [
    {
      name: 'bot-backend',
      script: './start-backend.sh',
      cwd: '/home/dankartsev/bot-project/dist',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'bot-admin',
      script: 'admin-server.cjs',
      cwd: '/home/dankartsev/bot-project/dist',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        ADMIN_PORT: 3001
      },
      error_file: './logs/admin-error.log',
      out_file: './logs/admin-out.log',
      log_file: './logs/admin-combined.log',
      time: true,
      max_memory_restart: '512M',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
