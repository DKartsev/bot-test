import { Context } from 'telegraf';
import logger from '../utils/logger';
import { audioQueue, videoQueue } from '../queue';
import supabase from '../db';

export default async function mediaHandler(ctx: Context) {
  try {
    const message: any = ctx.message;
    if (!message) return;

    let fileId: string | undefined;
    let mediaType: 'audio' | 'video' | 'photo' | undefined;

    if (message.voice) {
      fileId = message.voice.file_id;
      mediaType = 'audio';
    } else if (message.audio) {
      fileId = message.audio.file_id;
      mediaType = 'audio';
    } else if (message.video) {
      fileId = message.video.file_id;
      mediaType = 'video';
    } else if (message.photo) {
      const photo = message.photo[message.photo.length - 1];
      fileId = photo.file_id;
      mediaType = 'photo';
    }

    if (!fileId || !mediaType) {
      logger.warn('Unsupported media type');
      return;
    }

    const link = await ctx.telegram.getFileLink(fileId);
    const url = typeof link === 'string' ? link : link.href;

    if (mediaType === 'audio') {
      await audioQueue.add('transcription', { url });
    } else {
      let messageId: number | undefined;
      const { data } = await supabase
        .from('messages')
        .insert({ video_url: url })
        .select('id')
        .single();
      messageId = data?.id;
      await videoQueue.add('vision', { url, messageId });
    }

    await ctx.reply('Media received, processing...');
  } catch (err) {
    logger.error({ err }, 'Error in mediaHandler');
  }
}
