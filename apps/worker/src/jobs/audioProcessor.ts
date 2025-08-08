import { Job } from 'bullmq';
import logger from '../utils/logger';
import supabase from '../utils/supabaseClient';

export default async function audioProcessor(job: Job) {
  try {
    const url: string | undefined = job.data?.url;
    if (!url) throw new Error('Missing audio URL');

    const response = await fetch(url);
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

    const text = transcription.text as string;

    await supabase.from('messages').insert({ content: text, audio_url: url });

    logger.info({ jobId: job.id }, 'Audio processed');
  } catch (err) {
    logger.error({ err, jobId: job.id }, 'Audio processing failed');
    throw err;
  }
}
