import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.JELLY_PORT || 4173);
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    const decodedPath = decodeURIComponent(requestUrl.pathname);
    const candidate = path.resolve(root, `.${decodedPath}`);
    if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    let filePath = candidate;
    try {
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    } catch {
      if (!path.extname(filePath)) filePath = path.join(root, 'index.html');
    }

    const file = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const type = mimeTypes[extension] || 'application/octet-stream';
    const isImage = ['.png', '.webp', '.jpg', '.jpeg', '.svg', '.ico'].includes(extension);
    const cacheControl = isImage
      ? 'public, max-age=86400, stale-while-revalidate=604800'
      : 'no-cache';
    response.writeHead(200, { 'Content-Type': type, 'Cache-Control': cacheControl });
    response.end(file);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
  }
});

server.listen(port, () => {
  console.log(`Jelly Rescue RPG is running at http://localhost:${port}`);
});
