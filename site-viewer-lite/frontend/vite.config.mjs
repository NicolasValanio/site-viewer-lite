import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
const apiPort = Number(process.env.PORT) || 3000;

export default defineConfig({
  root: frontendRoot,
  plugins: [vue()],
  build: {
    outDir: path.resolve(frontendRoot, 'dist'),
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true
      }
    }
  }
});
