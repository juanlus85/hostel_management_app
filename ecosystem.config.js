module.exports = {
  apps: [
    {
      name: 'hostel_management_app',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      // Restart si la app consume demasiada memoria
      max_restarts: 10,
      restart_delay: 4000,
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
