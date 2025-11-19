import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StoryService, StoryTemplate } from "@/services/storyService";
import { useToast } from "@/hooks/use-toast";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import Image from "lucide-react/dist/esm/icons/image";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Type from "lucide-react/dist/esm/icons/type";
import Video from "lucide-react/dist/esm/icons/video";

interface StoryTemplateSelectorProps {
  onSelect: (template: StoryTemplate) => void;
}

export const StoryTemplateSelector: React.FC<StoryTemplateSelectorProps> = ({
  onSelect,
}) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<StoryTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await StoryService.getTemplates();
      setTemplates(data);
    } catch (error: any) {
      toast({
        title: "Failed to load templates",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTemplate = (template: StoryTemplate) => {
    setSelectedTemplateId(template.template_id);
    onSelect(template);
  };

  // Get unique categories
  const categories = ["all", ...Array.from(new Set(templates.map(t => t.category).filter(Boolean)))];

  // Filter templates by category
  const filteredTemplates = activeCategory === "all"
    ? templates
    : templates.filter(t => t.category === activeCategory);

  const getMediaTypeIcon = (mediaType: string) => {
    switch (mediaType) {
      case "image":
        return <Image className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "text":
        return <Type className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case "quiz":
        return "bg-blue-500";
      case "announcement":
        return "bg-yellow-500";
      case "promotion":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No templates available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose a Template</h3>
        <p className="text-sm text-muted-foreground">
          Select a pre-designed template to get started quickly
        </p>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList>
          {categories.map((category) => (
            <TabsTrigger key={category} value={category} className="capitalize">
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => (
              <Card
                key={template.template_id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedTemplateId === template.template_id
                    ? "border-primary ring-2 ring-primary"
                    : ""
                }`}
                onClick={() => handleSelectTemplate(template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {template.name}
                        {selectedTemplateId === template.template_id && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </CardTitle>
                      {template.description && (
                        <CardDescription className="text-xs mt-1">
                          {template.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    {template.category && (
                      <Badge
                        variant="secondary"
                        className={`${getCategoryColor(template.category)} text-white text-xs`}
                      >
                        {template.category}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {getMediaTypeIcon(template.media_type)}
                      <span className="ml-1 capitalize">{template.media_type}</span>
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pb-3">
                  {/* Template Preview */}
                  <div
                    className="relative aspect-video rounded-lg overflow-hidden border"
                    style={{
                      backgroundColor: template.background_color || "#3B82F6",
                    }}
                  >
                    {template.preview_url ? (
                      <img
                        src={template.preview_url}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
                        {template.default_text_overlay &&
                          template.default_text_overlay.length > 0 && (
                            <>
                              {template.default_text_overlay.map((overlay, index) => (
                                <div
                                  key={index}
                                  className="mb-2"
                                  style={{
                                    fontSize: `${Math.min(overlay.fontSize / 3, 16)}px`,
                                    fontWeight: overlay.fontWeight || "normal",
                                    color: overlay.color,
                                    textAlign: (overlay.align as "left" | "center" | "right" | "justify") || "left",
                                  }}
                                >
                                  {overlay.text}
                                </div>
                              ))}
                            </>
                          )}
                      </div>
                    )}
                  </div>

                  {/* Usage Count */}
                  <div className="mt-2 text-xs text-muted-foreground text-center">
                    Used {template.usage_count} times
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No templates in this category
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
