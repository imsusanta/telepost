import { Trophy, Target } from "lucide-react";

interface DashboardStatsProps {
    overallScore: number;
    gradeAverage: number;
    workAssigned: number;
    workAssignedAverage: number;
}

export function DashboardStats({ overallScore, gradeAverage, workAssigned, workAssignedAverage }: DashboardStatsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Overall Class Score */}
            <div className="bg-white dark:bg-card p-10 rounded-5xl soft-shadow-lg flex items-center justify-between group transition-all duration-500 hover:soft-shadow-xl border border-border/40">
                <div className="space-y-1">
                    <h3 className="text-xl font-bold text-muted-foreground">Overall Class Score</h3>
                    <div className="flex items-baseline gap-1">
                        <span className="text-6xl font-black text-foreground">{overallScore}%</span>
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground pt-4">
                        Grade average <span className="text-foreground ml-2">{gradeAverage}%</span>
                    </p>
                </div>
                <div className="relative">
                    <div className="w-40 h-40 bg-playful-green/10 rounded-full flex items-center justify-center transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
                        <Trophy className="w-24 h-24 text-[hsl(var(--playful-green))] stroke-[2.5]" />
                    </div>
                </div>
            </div>

            {/* Work Assigned */}
            <div className="bg-white dark:bg-card p-10 rounded-5xl soft-shadow-lg flex items-center justify-between group transition-all duration-500 hover:soft-shadow-xl border border-border/40">
                <div className="space-y-1">
                    <h3 className="text-xl font-bold text-muted-foreground">Work Assigned</h3>
                    <div className="flex items-baseline gap-1">
                        <span className="text-6xl font-black text-foreground">{workAssigned}</span>
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground pt-4">
                        Grade average <span className="text-foreground ml-2">{workAssignedAverage}%</span>
                    </p>
                </div>
                <div className="relative">
                    <div className="w-40 h-40 bg-playful-green/10 rounded-full flex items-center justify-center overflow-hidden transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6">
                        <div className="grid grid-cols-4 gap-2 p-4">
                            {Array.from({ length: 16 }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-4 h-4 rounded-full transition-all duration-500 delay-[${i * 50}ms] group-hover:scale-125 ${i % 3 === 0 ? "bg-[hsl(var(--playful-green))]" : "bg-[hsl(var(--playful-green))]/30"
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
