import { defineConfig } from 'vite';
import { readFileSync } from 'fs';

const tauriConf = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf-8'));

export default defineConfig({
  define: {
    '__APP_VERSION__': JSON.stringify(tauriConf.version),
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
});
