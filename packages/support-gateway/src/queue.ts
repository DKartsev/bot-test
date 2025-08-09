import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  REDIS_URL: z.string().url(),
});

const { REDIS_URL } = envSchema.parse(process.env);

const connection = new IORedis(REDIS_URL);

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
};

export const audioQueue = new Queue('audio', { connection, defaultJobOptions });
export const videoQueue = new Queue('video', { connection, defaultJobOptions });
