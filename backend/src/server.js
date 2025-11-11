import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import pino from 'pino';
import { router as nof1Router } from './routes/nof1.js';

// 尝试从仓库根目录读取 config.json 并回填到 process.env（仅限 config.env 的扁平键值）
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const rootConfigPath = path.resolve(__dirname, '..', '..', 'config.json');
  if (fs.existsSync(rootConfigPath)) {
    const raw = fs.readFileSync(rootConfigPath, 'utf-8');
    const cfg = JSON.parse(raw);
    if (cfg && cfg.env && typeof cfg.env === 'object') {
      for (const [k, v] of Object.entries(cfg.env)) {
        if (typeof v === 'string' && process.env[k] === undefined) {
          process.env[k] = v;
        }
      }
    }
  }
} catch (err) {
  // 静默失败，保持向后兼容 .env
}

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api/nof1', nof1Router);

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  logger.info({ port }, 'backend server listening');
});


