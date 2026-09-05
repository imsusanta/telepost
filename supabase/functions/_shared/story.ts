import { telegramRequest, type TelegramSendResult } from "./telegram.ts";

export interface StoryOverlay {
  text?: string;
  fontWeight?: string;
  emoji?: string;
}

export interface StoryPayload {
  media_type?: string;
  media_url?: string | null;
  caption?: string | null;
  text_overlay?: StoryOverlay[] | null;
  stickers?: Array<{ emoji?: string }> | null;
  duration_hours?: number | null;
}

export function buildCaption(story: StoryPayload): string {
  let caption = story.caption || "";
  if (Array.isArray(story.text_overlay) && story.text_overlay.length > 0) {
    const overlayTexts = story.text_overlay
      .map((overlay) => overlay.text)
      .filter((text): text is string => Boolean(text && text.trim()));
    if (overlayTexts.length > 0) {
      caption = overlayTexts.join("\n") + (caption ? "\n\n" + caption : "");
    }
  }
  return caption || "New story";
}

export function buildTextStory(story: StoryPayload): string {
  let content = "";
  if (Array.isArray(story.text_overlay) && story.text_overlay.length > 0) {
    content = story.text_overlay.map((overlay) => {
      let formatted = overlay.text || "";
      if (overlay.fontWeight === "bold") formatted = `*${formatted}*`;
      return formatted;
    }).join("\n\n");
  }
  if (story.caption) {
    content += content ? "\n\n" + story.caption : story.caption;
  }
  if (Array.isArray(story.stickers) && story.stickers.length > 0) {
    const emojiString = story.stickers.map((s) => s.emoji).filter(Boolean).join(" ");
    if (emojiString) content += "\n\n" + emojiString;
  }
  return content || "New announcement";
}

export async function sendStoryToTelegram(input: {
  botToken: string;
  chatId: string;
  story: StoryPayload;
}): Promise<TelegramSendResult> {
  const baseUrl = `https://api.telegram.org/bot${input.botToken}`;
  const mediaType = input.story.media_type || "text";

  if (mediaType === "image") {
    return await telegramRequest(`${baseUrl}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: input.chatId,
        photo: input.story.media_url,
        caption: buildCaption(input.story),
        parse_mode: "Markdown",
      }),
    });
  }

  if (mediaType === "video") {
    return await telegramRequest(`${baseUrl}/sendVideo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: input.chatId,
        video: input.story.media_url,
        caption: buildCaption(input.story),
        parse_mode: "Markdown",
        supports_streaming: true,
      }),
    });
  }

  return await telegramRequest(`${baseUrl}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: input.chatId,
      text: buildTextStory(input.story),
      parse_mode: "Markdown",
    }),
  });
}
