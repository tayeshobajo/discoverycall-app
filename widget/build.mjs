/**
 * Widget build script — esbuild
 *
 * Builds two outputs:
 *   public/embed/embed.js  — loader script (<8KB)
 *   public/embed/chat.js   — chat module (~80KB, Preact + Shadow DOM)
 */

import * as esbuild from 'esbuild';
import { mkdir } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../public/embed');

await mkdir(outDir, { recursive: true });

const sharedOptions = {
  bundle: true,
  minify: true,
  sourcemap: false,
  target: 'esnext',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
};

// Build embed.js (loader — vanilla TS, no framework)
await esbuild.build({
  ...sharedOptions,
  entryPoints: [resolve(__dirname, 'src/embed.ts')],
  outfile: resolve(outDir, 'embed.js'),
  format: 'iife',
  // Should be well under 8KB
});

// Build chat.js (chat module — Preact + Shadow DOM)
await esbuild.build({
  ...sharedOptions,
  entryPoints: [resolve(__dirname, 'src/chat.tsx')],
  outfile: resolve(outDir, 'chat.js'),
  format: 'iife',
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
  jsx: 'transform',
  alias: {
    'react': 'preact/compat',
    'react-dom': 'preact/compat',
  },
  external: [],
});

// Report sizes
import { stat } from 'fs/promises';

const embedStat = await stat(resolve(outDir, 'embed.js'));
const chatStat = await stat(resolve(outDir, 'chat.js'));

console.log(`✓ embed.js  ${(embedStat.size / 1024).toFixed(1)}KB`);
console.log(`✓ chat.js   ${(chatStat.size / 1024).toFixed(1)}KB`);
console.log(`✓ Output: ${outDir}`);
