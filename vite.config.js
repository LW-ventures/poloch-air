import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' -> funktioniert unter https://<name>.github.io/<repo>/ ohne Anpassung
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173 },
});
