import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import MoveVertical from "lucide-react/dist/esm/icons/move-vertical";
import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import { TextOverlay } from "@/services/storyService";

interface TextOverlayEditorProps {
  overlays: TextOverlay[];
  onChange: (overlays: TextOverlay[]) => void;
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
  showBackground?: boolean;
}

export const TextOverlayEditor: React.FC<TextOverlayEditorProps> = ({
  overlays,
  onChange,
  backgroundColor,
  onBackgroundColorChange,
  showBackground = false,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addTextOverlay = () => {
    const newOverlay: TextOverlay = {
      text: "New Text",
      fontSize: 32,
      fontWeight: "normal",
      color: "#FFFFFF",
      position: { x: 50, y: 50 },
      align: "center",
    };

    onChange([...overlays, newOverlay]);
    setEditingIndex(overlays.length);
  };

  const updateOverlay = (index: number, updates: Partial<TextOverlay>) => {
    const newOverlays = [...overlays];
    newOverlays[index] = { ...newOverlays[index], ...updates };
    onChange(newOverlays);
  };

  const removeOverlay = (index: number) => {
    const newOverlays = overlays.filter((_, i) => i !== index);
    onChange(newOverlays);
    setEditingIndex(null);
  };

  const moveOverlay = (index: number, direction: "up" | "down") => {
    const newOverlays = [...overlays];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= overlays.length) return;

    [newOverlays[index], newOverlays[targetIndex]] = [
      newOverlays[targetIndex],
      newOverlays[index],
    ];

    onChange(newOverlays);
    setEditingIndex(targetIndex);
  };

  return (
    <div className="space-y-4">
      {showBackground && (
        <div className="space-y-2">
          <Label>Background Color</Label>
          <div className="flex gap-2 items-center">
            <Input
              type="color"
              value={backgroundColor}
              onChange={(e) => onBackgroundColorChange(e.target.value)}
              className="w-20 h-10"
            />
            <Input
              type="text"
              value={backgroundColor}
              onChange={(e) => onBackgroundColorChange(e.target.value)}
              placeholder="#3B82F6"
              className="flex-1"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Text Overlays</Label>
          <Button size="sm" variant="outline" onClick={addTextOverlay}>
            <Plus className="h-4 w-4 mr-1" />
            Add Text
          </Button>
        </div>

        {overlays.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No text overlays yet. Click "Add Text" to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {overlays.map((overlay, index) => (
              <Card key={index} className={editingIndex === index ? "border-primary" : ""}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-3">
                      {/* Text Input */}
                      <div className="space-y-1">
                        <Label className="text-xs">Text</Label>
                        <Input
                          value={overlay.text}
                          onChange={(e) =>
                            updateOverlay(index, { text: e.target.value })
                          }
                          placeholder="Enter text..."
                          onFocus={() => setEditingIndex(index)}
                        />
                      </div>

                      {editingIndex === index && (
                        <>
                          {/* Font Size */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Font Size</Label>
                              <Input
                                type="number"
                                min={12}
                                max={96}
                                value={overlay.fontSize}
                                onChange={(e) =>
                                  updateOverlay(index, {
                                    fontSize: parseInt(e.target.value) || 32,
                                  })
                                }
                              />
                            </div>

                            {/* Font Weight */}
                            <div className="space-y-1">
                              <Label className="text-xs">Weight</Label>
                              <Select
                                value={overlay.fontWeight || "normal"}
                                onValueChange={(value) =>
                                  updateOverlay(index, { fontWeight: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="normal">Normal</SelectItem>
                                  <SelectItem value="bold">Bold</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Color */}
                          <div className="space-y-1">
                            <Label className="text-xs">Color</Label>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={overlay.color}
                                onChange={(e) =>
                                  updateOverlay(index, { color: e.target.value })
                                }
                                className="w-20 h-9"
                              />
                              <Input
                                type="text"
                                value={overlay.color}
                                onChange={(e) =>
                                  updateOverlay(index, { color: e.target.value })
                                }
                                placeholder="#FFFFFF"
                                className="flex-1"
                              />
                            </div>
                          </div>

                          {/* Position */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Position X (%)</Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={overlay.position.x}
                                onChange={(e) =>
                                  updateOverlay(index, {
                                    position: {
                                      ...overlay.position,
                                      x: parseInt(e.target.value) || 0,
                                    },
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Position Y (%)</Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={overlay.position.y}
                                onChange={(e) =>
                                  updateOverlay(index, {
                                    position: {
                                      ...overlay.position,
                                      y: parseInt(e.target.value) || 0,
                                    },
                                  })
                                }
                              />
                            </div>
                          </div>

                          {/* Alignment */}
                          <div className="space-y-1">
                            <Label className="text-xs">Alignment</Label>
                            <Select
                              value={overlay.align || "center"}
                              onValueChange={(value) =>
                                updateOverlay(index, { align: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left">Left</SelectItem>
                                <SelectItem value="center">Center</SelectItem>
                                <SelectItem value="right">Right</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => moveOverlay(index, "up")}
                        disabled={index === 0}
                        className="h-8 w-8"
                      >
                        <MoveVertical className="h-4 w-4 rotate-180" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => moveOverlay(index, "down")}
                        disabled={index === overlays.length - 1}
                        className="h-8 w-8"
                      >
                        <MoveVertical className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeOverlay(index)}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Preview */}
                  <div
                    className="mt-2 p-4 rounded bg-muted text-center"
                    style={{
                      fontSize: `${Math.min(overlay.fontSize / 2, 24)}px`,
                      fontWeight: overlay.fontWeight || "normal",
                      color: overlay.color,
                    }}
                  >
                    {overlay.text || "Preview"}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Emoji/Sticker Selector */}
      <div className="space-y-2">
        <Label>Quick Emojis</Label>
        <div className="flex flex-wrap gap-2">
          {["🎉", "🔥", "❤️", "👍", "⭐", "💯", "🚀", "🎯", "💪", "✨"].map((emoji) => (
            <Button
              key={emoji}
              size="sm"
              variant="outline"
              onClick={() => {
                const newOverlay: TextOverlay = {
                  text: emoji,
                  fontSize: 48,
                  color: "#FFFFFF",
                  position: { x: 50, y: 50 },
                  align: "center",
                };
                onChange([...overlays, newOverlay]);
              }}
            >
              {emoji}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
