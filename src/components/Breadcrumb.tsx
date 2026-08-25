import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumb({ className = "" }: { className?: string }) {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  const formatBreadcrumb = (path: string): string => {
    return path
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (pathnames.length === 0 || location.pathname === "/") {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center space-x-1.5 text-xs font-medium">
        <li>
          <Link
            to="/dashboard"
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dashboard"
          >
            <Home className="w-3.5 h-3.5" />
          </Link>
        </li>
        {pathnames.map((path, index) => {
          const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isLast = index === pathnames.length - 1;

          return (
            <li key={routeTo} className="flex items-center space-x-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" aria-hidden="true" />
              {isLast ? (
                <span className="text-foreground font-semibold" aria-current="page">
                  {formatBreadcrumb(path)}
                </span>
              ) : (
                <Link
                  to={routeTo}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {formatBreadcrumb(path)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
