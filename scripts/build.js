import { build } from 'vite';
import fs from 'fs';
import path from 'path';

async function runBuild() {
  const distDir = path.resolve('dist');
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  // Copy public assets
  const publicDir = path.resolve('public');
  if (fs.existsSync(publicDir)) {
    fs.cpSync(publicDir, distDir, { recursive: true });
  }

  console.log('📦 Building content.js as self-contained IIFE...');
  await build({
    configFile: false,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      target: 'es2022',
      minify: false, // Keep readable for easy inspection
      rollupOptions: {
        input: path.resolve('src/content.ts'),
        output: {
          format: 'iife',
          entryFileNames: 'content.js',
          name: 'CanvasCompassContent',
          inlineDynamicImports: true
        }
      }
    }
  });

  console.log('⚙️ Building service-worker.js as ES module...');
  await build({
    configFile: false,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      target: 'es2022',
      minify: false,
      rollupOptions: {
        input: path.resolve('src/service-worker.ts'),
        output: {
          format: 'es',
          entryFileNames: 'service-worker.js',
          inlineDynamicImports: true
        }
      }
    }
  });

  console.log('✅ Build complete! All scripts are self-contained without external chunk dependencies.');
}

runBuild().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
