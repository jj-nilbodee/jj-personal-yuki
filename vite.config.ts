import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages serves project sites from /<repository-name>/ rather than /.
  base: process.env.GITHUB_ACTIONS ? '/jj-personal-yuki/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Allow local network preview (useful for opening on physical iPhone on same Wi-Fi)
  }
});
