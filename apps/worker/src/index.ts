import dotenv from 'dotenv';
import { z } from 'zod';
import { Worker } from 'bullmq';
import { audioQueue, videoQueue } from './queue';
import audioProcessor from './jobs/audioProcessor';
import videoProcessor from './jobs/videoProcessor';
import logger from './utils/logger';

dotenv.config();

const envSchema = z.object({
  REDIS_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
});

envSchema.parse(process.env);

const audioWorker = new Worker(audioQueue.name, audioProcessor, {
  connection: audioQueue.opts.connection,
});
audioWorker.on('failed', (job, err) => {
  logger.error({ jobId: job.id, err }, 'Audio job failed');
});

const videoWorker = new Worker(videoQueue.name, videoProcessor, {
  connection: videoQueue.opts.connection,
});
videoWorker.on('failed', (job, err) => {
  logger.error({ jobId: job.id, err }, 'Video job failed');
});

logger.info('Worker started');
