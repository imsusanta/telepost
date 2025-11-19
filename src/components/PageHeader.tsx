import { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  action,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 ${className}`}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="p-3 clay-card bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl shadow-clay">
            <Icon className="h-7 w-7 text-primary" />
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-gradient bg-gradient-to-r from-primary via-accent to-secondary mb-2 animate-slide-up">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground text-lg animate-slide-up" style={{ animationDelay: "0.1s" }}>
              {description}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
          {action}
        </div>
      )}
    </div>
  );
}
