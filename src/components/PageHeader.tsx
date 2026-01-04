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
    <div className={`flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4 overflow-visible ${className}`}>
      <div className="flex items-end gap-3">
        {Icon && (
          <div className="p-2 rounded-xl bg-white/50 dark:bg-card/50 border border-white/20 backdrop-blur-xl soft-shadow-lg transition-all duration-500 hover:scale-110 hover:-rotate-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
        <div className="flex-1 space-y-0">
          <h1 className="text-2xl font-black text-foreground tracking-tight leading-none animate-in fade-in slide-in-from-left-4 duration-700">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground font-bold max-w-2xl animate-in fade-in slide-in-from-left-4 duration-700 delay-100 uppercase tracking-wide opacity-80">
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
