import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')) as { version: string };

export default defineConfig({
  base: './',
  define: {
    __DER_BUILDER_VERSION__: JSON.stringify(packageJson.version)
  },
  build: {
    modulePreload: { polyfill: false },
    rollupOptions: {
      preserveEntrySignatures: 'strict',
      input: {
        main: resolve(__dirname, 'index.html'),
        core: resolve(__dirname, 'src/core.ts'),
        validation: resolve(__dirname, 'src/validation.ts'),
        app: resolve(__dirname, 'src/app.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => assetInfo.names?.some((name) => name.endsWith('.css')) ? 'styles.css' : 'assets/[name][extname]',
        minifyInternalExports: false
      }
    }
  }
});
