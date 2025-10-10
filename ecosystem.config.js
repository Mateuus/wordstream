module.exports = {
  apps: [
    {
      name: 'wordstream-pwa',
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        REDIS_URL: 'redis://192.168.5.210:6379'
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        REDIS_URL: 'redis://192.168.5.210:6379'
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
        REDIS_URL: 'redis://192.168.5.210:6379'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3500,
        REDIS_URL: 'redis://192.168.5.210:6379',
        NEXT_PUBLIC_APP_URL: 'https://wordstream.bdjcoins.com',
        NEXT_PUBLIC_BASE_URL: 'https://wordstream.bdjcoins.com'
      },
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        '.git',
        '.next',
        'public/sw.js',
        'public/workbox-*.js'
      ],
      watch_options: {
        followSymlinks: false
      },
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 3000,
      autorestart: true,
      cron_restart: '0 2 * * *', // Reinicia diariamente às 2h
      time: true,
      source_map_support: true,
      instance_var: 'INSTANCE_ID',
      vizion: false,
      pmx: true,
      // Configurações específicas para PWA
      post_update: ['npm install', 'npm run build'],
      // Monitoramento de recursos
      monitoring: {
        http: true,
        https: false,
        port: 9615
      }
    }
  ],

  deploy: {
    production: {
      user: 'mateuus',
      host: '192.168.5.210',
      ref: 'origin/main',
      repo: 'git@github.com:mateuus/wordstream.git',
      path: '/home/mateuus/bdj/wordstream',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      ssh_options: 'StrictHostKeyChecking=no'
    },
    staging: {
      user: 'mateuus',
      host: '192.168.5.210',
      ref: 'origin/develop',
      repo: 'git@github.com:mateuus/wordstream.git',
      path: '/home/mateuus/bdj/wordstream-staging',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': '',
      ssh_options: 'StrictHostKeyChecking=no'
    }
  }
};
