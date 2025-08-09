import { Job } from 'bullmq';
import { z } from 'zod';
import logger from '../utils/logger';
import supabase from '../utils/supabaseClient';
import { liveBus } from '../utils/liveBus';

export default async function audioProcessor(job: Job) {
  try {
    const schema = z.object({
      messageId: z.number(),
      mediaUrl: z.string().url(),
    });

    const { messageId, mediaUrl } = schema.parse(job.data);

    const response = await fetch(mediaUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    const form = new FormData();
    form.append('file', new Blob([buffer]), 'audio.ogg');
    form.append('model', 'whisper-1');

    const transcription = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: form,
    }).then((r) => r.json());

    const transcript = transcription.text as string;

    const { error } = await supabase
      .from('messages')
      .update({ transcript, content: transcript })
      .eq('id', messageId);
    if (error) throw error;

    liveBus.emit('media_updated', { message_id: messageId, kind: 'transcript' });

    logger.info({ jobId: job.id }, 'Audio processed');
  } catch (err) {
    logger.error({ err, jobId: job.id }, 'Audio processing failed');
    throw err;
  }
}
