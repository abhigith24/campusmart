import { defineConfig, loadEnv, transformWithOxc } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  // Map environment variables starting with REACT_APP_ into process.env.*
  const envWithProcessPrefix = Object.keys(env).reduce((prev, key) => {
    if (key.startsWith('REACT_APP_')) {
      prev[`process.env.${key}`] = JSON.stringify(env[key]);
    }
    return prev;
  }, {});

  // Add process.env.NODE_ENV
  envWithProcessPrefix['process.env.NODE_ENV'] = JSON.stringify(mode);

  return {
    plugins: [
      {
        name: 'treat-js-files-as-jsx',
        enforce: 'pre',
        async transform(code, id) {
          if (!id.match(/src\/.*\.js$/)) return null;

          return transformWithOxc(code, id, {
            lang: 'jsx',
          });
        },
      },
      react(),
    ],
    define: envWithProcessPrefix,
    server: {
      port: 3000,
    },
    build: {
      outDir: 'build',
      chunkSizeWarningLimit: 1000,
    }
  };
});
