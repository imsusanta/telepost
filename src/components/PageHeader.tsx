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
    <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-12 overflow-visible ${className}`}>
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="p-4 rounded-3xl bg-white dark:bg-card border border-border/40 soft-shadow-lg transition-transform duration-500 hover:scale-110 hover:rotate-3">
            <Icon className="h-8 w-8 text-primary" />
          </div>
        )}
        <div className="flex-1 space-y-1">
          <h1 className="text-5xl font-black text-foreground tracking-tight leading-tight animate-in fade-in slide-in-from-left-4 duration-700">
            {title}
          </h1>
          {description && (
            <p className="text-xl text-muted-foreground font-medium max-w-2xl animate-in fade-in slide-in-from-left-4 duration-700 delay-100">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
          {action}
        </div>
      )}
    </div>
  );
}
