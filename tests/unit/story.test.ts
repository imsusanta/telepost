import { describe, expect, it } from "vitest";
import { buildCaption, buildTextStory } from "../../supabase/functions/_shared/story.ts";

describe("story payload helpers", () => {
  it("builds a caption from overlay text without inventing engagement stats", () => {
    expect(buildCaption({
      caption: "Daily quiz",
      text_overlay: [{ text: "UPSC" }, { text: " " }],
    })).toBe("UPSC\n\nDaily quiz");
  });

  it("sends text stories instead of marking them posted without a Telegram call", () => {
    expect(buildTextStory({
      caption: "Announcement",
      text_overlay: [{ text: "Hello", fontWeight: "bold" }],
      stickers: [{ emoji: "📌" }],
    })).toBe("*Hello*\n\nAnnouncement\n\n📌");
  });
});
