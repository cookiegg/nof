import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 使用文件位置作为锚点，避免依赖启动时的工作目录
const dataDir = path.resolve(__dirname, '..', '..', 'data');

async function ensureDir() {
  await fs.mkdir(dataDir, { recursive: true }).catch(() => {});
}

export async function loadJson(name, fallback) {
  await ensureDir();
  const file = path.join(dataDir, name);
  try {
    const buf = await fs.readFile(file, 'utf8');
    return JSON.parse(buf);
  } catch (e) {
    return fallback;
  }
}

export async function saveJson(name, obj) {
  await ensureDir();
  const file = path.join(dataDir, name);
  const tmp = file + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(obj, null, 2));
  await fs.rename(tmp, file);
}


