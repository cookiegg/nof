import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pino from 'pino';
import { router as nof1Router } from './routes/nof1.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api/nof1', nof1Router);

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  logger.info({ port }, 'backend server listening');
});


