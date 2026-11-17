import { mkdir, copyFile, writeFile } from 'node:fs/promises';
const apiBaseUrl = process.env.PUBLIC_API_BASE_URL || 'http://localhost:5001/api';
const parsed = new URL(apiBaseUrl);
if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
  throw new Error('PUBLIC_API_BASE_URL must be an HTTP(S) API URL without credentials or query parameters');
}
if (process.env.VERCEL && (!process.env.PUBLIC_API_BASE_URL || parsed.protocol !== 'https:')) {
  throw new Error('Set PUBLIC_API_BASE_URL to your live HTTPS backend URL ending in /api');
}
await mkdir('dist', { recursive: true });
for (const name of ['index.html', 'app.js', 'style.css']) await copyFile(name, `dist/${name}`);
await writeFile('dist/config.js', `window.APP_CONFIG = ${JSON.stringify({ apiBaseUrl })};\n`);
console.log('Frontend built');
