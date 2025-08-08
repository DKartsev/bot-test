import { Job } from 'bullmq';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import logger from '../utils/logger';
import supabase from '../utils/supabaseClient';

export default async function videoProcessor(job: Job) {
  const url: string | undefined = job.data?.url;
  if (!url) throw new Error('Missing video URL');

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'frames-'));

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(url)
        .output(path.join(tempDir, 'frame-%04d.png'))
        .outputOptions(['-vf', 'fps=1/2'])
        .on('end', resolve)
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
    if (job.data?.messageId) {
      await supabase
        .from('messages')
        .update({ vision_summary: summary })
        .eq('id', job.data.messageId);
    }

    logger.info({ jobId: job.id }, 'Video processed');
  } catch (err) {
    logger.error({ err, jobId: job.id }, 'Video processing failed');
    throw err;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
