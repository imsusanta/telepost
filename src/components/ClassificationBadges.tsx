import { Badge } from "@/components/ui/badge";
import { getSubjectColor, getSubjectIcon } from "@/services/classificationService";
import { BookOpen, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ClassificationBadgesProps {
    subject?: string;
    topic?: string;
    difficulty?: string;
    createdAt?: string;
    compact?: boolean;
}

export function ClassificationBadges({
    subject,
    topic,
    difficulty,
    createdAt,
    compact = false,
}: ClassificationBadgesProps) {
    const subjectColor = getSubjectColor(subject || '');
    const subjectIcon = getSubjectIcon(subject || '');

    // Format date
    const formattedDate = createdAt
        ? formatDistanceToNow(new Date(createdAt), { addSuffix: true })
        : null;

    if (compact) {
        return (
            <div className="flex flex-wrap items-center gap-1.5">
                {subject && (
                    <Badge
                        variant="outline"
                        className="text-[10px] font-semibold px-1.5 py-0.5 border-0"
                        style={{
                            backgroundColor: `${subjectColor}15`,
                            color: subjectColor,
                        }}
                    >
                        {subjectIcon} {subject}
                    </Badge>
                )}
                {topic && (
                    <Badge
                        variant="outline"
                        className="text-[10px] font-medium px-1.5 py-0.5 bg-white/5 border-white/15 text-muted-foreground"
                    >
                        {topic}
                    </Badge>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            {/* Subject Badge */}
            {subject && (
                <Badge
                    variant="outline"
                    className="text-xs font-semibold px-2.5 py-1 border-0 gap-1.5 transition-all hover:scale-105"
                    style={{
                        backgroundColor: `${subjectColor}15`,
                        color: subjectColor,
                    }}
                >
                    <span>{subjectIcon}</span>
                    {subject}
                </Badge>
            )}

            {/* Topic Badge */}
            {topic && (
                <Badge
                    variant="outline"
                    className="text-[11px] font-medium px-2 py-1 bg-white/[0.08] border-white/[0.15] text-muted-foreground gap-1.5"
                >
                    <BookOpen className="w-3 h-3" />
                    {topic}
                </Badge>
            )}

            {/* Date Badge */}
            {formattedDate && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formattedDate}
                </span>
            )}
        </div>
    );
}

// Standalone Subject Badge component
interface SubjectBadgeProps {
    subject: string;
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
}

export function SubjectBadge({ subject, size = 'md', showIcon = true }: SubjectBadgeProps) {
    const color = getSubjectColor(subject);
    const icon = getSubjectIcon(subject);

    const sizeClasses = {
        sm: 'text-[10px] px-1.5 py-0.5',
        md: 'text-xs px-2 py-1',
        lg: 'text-sm px-3 py-1.5',
    };

    return (
        <Badge
            variant="outline"
            className={`font-semibold border-0 gap-1 ${sizeClasses[size]}`}
            style={{
                backgroundColor: `${color}15`,
                color: color,
            }}
        >
            {showIcon && <span>{icon}</span>}
            {subject}
        </Badge>
    );
}

// Standalone Difficulty Badge component (deprecated - returns null)
interface DifficultyBadgeProps {
    difficulty?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function DifficultyBadge(_props: DifficultyBadgeProps) {
    return null;
}
