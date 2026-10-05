import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        content: path.resolve(__dirname, 'src/content.ts'),
        'service-worker': path.resolve(__dirname, 'src/service-worker.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        format: 'es'
      }
    }
  },
  test: {
    globals: true,
    environment: 'node'
  }
});
