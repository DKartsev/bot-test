import { Context } from "telegraf";
import { z } from "zod";
import logger from "../utils/logger";
import { audioQueue, videoQueue } from "../queue";
import supabase from "../db";
import { getOrCreateConversation } from "../services/conversation";

export default async function mediaHandler(ctx: Context) {
  try {
    const message: any = ctx.message;
    if (!message) return;

    const mediaTypeSchema = z.enum(["audio", "video", "photo", "document"]);
    let fileId: string | undefined;
    let mediaType: z.infer<typeof mediaTypeSchema> | undefined;

    if (message.voice) {
      fileId = message.voice.file_id;
      mediaType = "audio";
    } else if (message.audio) {
      fileId = message.audio.file_id;
      mediaType = "audio";
    } else if (message.video) {
      fileId = message.video.file_id;
      mediaType = "video";
    } else if (message.photo) {
      const photo = message.photo[message.photo.length - 1];
      fileId = photo.file_id;
      mediaType = "photo";
    } else if (message.document) {
      fileId = message.document.file_id;
      mediaType = "document";
    }

    if (!fileId || !mediaType) {
      logger.warn("Unsupported media type");
      return;
    }

    const link = await ctx.telegram.getFileLink(fileId);
    const publicUrl = z
      .string()
      .url()
      .parse(typeof link === "string" ? link : link.href);

    const { id: conversation_id } = await getOrCreateConversation({
      userTelegramId: String(ctx.from?.id),
      chatTelegramId: String(ctx.chat?.id),
      username: ctx.from?.username ?? null,
    });

    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({
        conversation_id,
        sender: "user",
        content: "Processing media",
        media_urls: [publicUrl],
        media_types: [mediaType],
      })
      .select("id")
      .single();

    if (error || !inserted) {
      logger.error({ error }, "Failed to insert media message");
      return;
    }

    if (mediaType === "audio") {
      await audioQueue.add("transcribe", {
        messageId: inserted.id,
        mediaUrl: publicUrl,
      });
    } else {
      await videoQueue.add("vision", {
        messageId: inserted.id,
        mediaUrl: publicUrl,
        mediaType,
      });
    }

    await ctx.reply("Media received, processing");
  } catch (err) {
    logger.error({ err }, "Error in mediaHandler");
  }
}
