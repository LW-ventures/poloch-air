import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Jede Version bekommt eine eindeutige Kennung. Die App vergleicht sie mit version.json auf dem
// Server und zeigt einen Hinweis, wenn eine neuere Version online ist (src/lib/update.js).
const BUILD_ID = Date.now().toString(36);

const versionFile = () => ({
  name: 'poloch-version-file',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) });
  },
});

// base './' -> funktioniert unter https://<name>.github.io/<repo>/ ohne Anpassung
export default defineConfig({
  base: './',
  plugins: [react(), versionFile()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  server: { port: 5173 },
});
