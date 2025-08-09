import { Job } from 'bullmq';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import logger from '../utils/logger';
import supabase from '../utils/supabaseClient';

export default async function videoProcessor(job: Job) {
  const schema = z.object({
    messageId: z.number(),
    mediaUrl: z.string().url(),
    mediaType: z.enum(['video', 'photo', 'document']).optional(),
  });

  const { messageId, mediaUrl, mediaType } = schema.parse(job.data);

  if (mediaType && mediaType !== 'video') {
    try {
      const payload = {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: 'Describe the image and extract any text.' },
              { type: 'input_image', image_url: mediaUrl },
            ],
          },
        ],
      };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      const summary = response.choices?.[0]?.message?.content?.[0]?.text || '';
      const { error } = await supabase
        .from('messages')
        .update({ vision_summary: summary, content: summary })
        .eq('id', messageId);
      if (error) throw error;

      logger.info({ jobId: job.id }, 'Image processed');
      return;
    } catch (err) {
      logger.error({ err, jobId: job.id }, 'Image processing failed');
      throw err;
    }
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'frames-'));

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(mediaUrl)
        .output(path.join(tempDir, 'frame-%04d.png'))
        .outputOptions(['-vf', 'fps=1/2'])
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });

    const files = await fs.readdir(tempDir);
    const summaries: string[] = [];

    for (const file of files) {
      const imagePath = path.join(tempDir, file);
      const image = await fs.readFile(imagePath);
      const base64 = image.toString('base64');

      const payload = {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: 'Describe the image and extract any text.' },
              { type: 'input_image', image_url: `data:image/png;base64,${base64}` },
            ],
          },
        ],
      };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      const description = response.choices?.[0]?.message?.content?.[0]?.text || '';
      summaries.push(description);
    }

    const summary = summaries.join('\n');
    const { error } = await supabase
      .from('messages')
      .update({ vision_summary: summary, content: summary })
      .eq('id', messageId);
    if (error) throw error;

    logger.info({ jobId: job.id }, 'Video processed');
  } catch (err) {
    logger.error({ err, jobId: job.id }, 'Video processing failed');
    throw err;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
