// Generates valid PNG icons (16x16, 48x48, 128x128) with CU Gold compass design
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, drawFn) {
  // Uncompressed raw image bytes: (width * 4 + 1 filter byte per row) * height
  const rowLength = 1 + width * 4;
  const rawData = Buffer.alloc(rowLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG chunks
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);

    const payload = Buffer.concat([typeBuf, data]);
    const crc = crc32(payload);
    crcBuf.writeUInt32BE(crc >>> 0, 0);

    return Buffer.concat([len, payload, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Simple CRC32 implementation
function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }

  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

// Drawing function for CU Gold compass
function drawCompass(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = (w / 2) - 1.5;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Outer circle
  if (dist > r) return [0, 0, 0, 0]; // Transparent

  // Circle border (CU Gold #CFB87C)
  if (dist >= r - 1.5) {
    return [207, 184, 124, 255];
  }

  // Background dark slate circle
  if (dist > r - 3) {
    return [28, 34, 48, 255];
  }

  // Compass needle (North point = red/gold, South point = white/slate)
  const angle = Math.atan2(dy, dx);
  // Diamond shape
  const normX = Math.abs(dx) / (r * 0.45);
  const normY = Math.abs(dy) / (r * 0.85);

  if (normX + normY <= 1) {
    if (dy < 0) {
      // Top tip (CU Gold / Crimson)
      return [207, 184, 124, 255];
    } else {
      // Bottom tip
      return [240, 244, 248, 255];
    }
  }

  return [20, 24, 33, 240];
}

const outDir = path.resolve('public/icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

for (const size of [16, 48, 128]) {
  const png = createPng(size, size, drawCompass);
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), png);
  console.log(`Generated icon-${size}.png`);
}
