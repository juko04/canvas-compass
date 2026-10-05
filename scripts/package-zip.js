import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

async function createExtensionZip() {
  const distDir = path.resolve('dist');
  if (!fs.existsSync(distDir)) {
    console.error('dist directory does not exist. Run "npm run build" first.');
    process.exit(1);
  }

  const zip = new JSZip();

  function addFolderToZip(dirPath, zipFolder) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const sub = zipFolder.folder(entry.name);
        addFolderToZip(fullPath, sub);
      } else {
        const content = fs.readFileSync(fullPath);
        zipFolder.file(entry.name, content);
      }
    }
  }

  console.log('Packaging dist/ into canvas-compass.zip...');
  addFolderToZip(distDir, zip);

  const zipData = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  const outZipPath = path.resolve('canvas-compass.zip');
  fs.writeFileSync(outZipPath, zipData);
  console.log(`Successfully created: ${outZipPath} (${Math.round(zipData.length / 1024)} KB)`);
}

createExtensionZip().catch(console.error);
