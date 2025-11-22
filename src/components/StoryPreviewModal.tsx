import React from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TextOverlay, Sticker } from "@/services/storyService";
import { Button } from "@/components/ui/button";

interface StoryPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyData: {
    media_type: "image" | "video" | "text";
    media_url?: string;
    caption?: string;
    text_overlay?: TextOverlay[];
    background_color?: string;
    stickers?: Sticker[];
  };
}

export const StoryPreviewModal: React.FC<StoryPreviewModalProps> = ({
  isOpen,
  onClose,
  storyData,
}) => {
  const { media_type, media_url, caption, text_overlay, background_color, stickers } = storyData;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Story Preview</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Story Preview Area */}
        <div className="relative aspect-[9/16] bg-gray-900 overflow-hidden">
          {/* Background or Media */}
          {media_type === "text" ? (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ backgroundColor: background_color || "#3B82F6" }}
            />
          ) : media_type === "image" && media_url ? (
            <img
              src={media_url}
              alt="Story preview"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : media_type === "video" && media_url ? (
            <video
              src={media_url}
              className="absolute inset-0 w-full h-full object-cover"
              controls
              autoPlay
              muted
              loop
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <p className="text-gray-400">No media selected</p>
            </div>
          )}

          {/* Text Overlays */}
          {text_overlay && text_overlay.length > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              {text_overlay.map((overlay, index) => (
                <div
                  key={index}
                  className="absolute"
                  style={{
                    left: `${overlay.position.x}%`,
                    top: `${overlay.position.y}%`,
                    transform: "translate(-50%, -50%)",
                    textAlign: (overlay.align as React.CSSProperties['textAlign']) || "center",
                    maxWidth: "90%",
                  }}
                >
                  <p
                    style={{
                      fontSize: `${overlay.fontSize}px`,
                      fontWeight: overlay.fontWeight || "normal",
                      color: overlay.color,
                      textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.2,
                    }}
                  >
                    {overlay.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Stickers */}
          {stickers && stickers.length > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              {stickers.map((sticker, index) => (
                <div
                  key={index}
                  className="absolute"
                  style={{
                    left: `${sticker.position.x}%`,
                    top: `${sticker.position.y}%`,
                    transform: "translate(-50%, -50%)",
                    fontSize: `${sticker.size || 48}px`,
                  }}
                >
                  {sticker.emoji}
                </div>
              ))}
            </div>
          )}

          {/* Caption */}
          {caption && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-white text-sm">{caption}</p>
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="p-4 bg-muted text-center text-sm text-muted-foreground">
          This is how your story will appear on Telegram
        </div>
      </DialogContent>
    </Dialog>
  );
};
