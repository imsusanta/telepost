import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface StatusCardProps {
  count: number;
  percentage: number;
  gradeAvg: number;
  status: "green" | "yellow" | "coral";
  students: { name: string; avatar?: string }[];
}

export function StatusDistribution({ count, percentage, gradeAvg, status, students }: StatusCardProps) {
  const statusClasses = {
    green: "status-card-green shadow-[0_15px_30px_-5px_hsla(75,64%,51%,0.4)]",
    yellow: "status-card-yellow shadow-[0_15px_30px_-5px_hsla(44,100%,63%,0.4)]",
    coral: "status-card-coral shadow-[0_15px_30px_-5px_hsla(13,100%,67%,0.4)]",
  };

  return (
    <div className={`${statusClasses[status]} p-8 rounded-4xl flex flex-col justify-between min-h-[300px] transition-transform duration-300 hover:scale-[1.02] cursor-default relative overflow-hidden group`}>
      <div className="absolute top-4 right-4 flex -space-x-3 opacity-80 group-hover:opacity-100 transition-opacity">
        {students.slice(0, 3).map((s, i) => (
          <Avatar key={i} className="w-10 h-10 border-4 border-white/20 shadow-sm transition-transform hover:translate-y-[-2px]">
            <AvatarImage src={s.avatar} alt={s.name} />
            <AvatarFallback className="bg-white/20 text-[10px] font-bold">
              {s.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        ))}
        {students.length > 3 && (
          <div className="w-10 h-10 rounded-full bg-white/20 border-4 border-white/20 flex items-center justify-center text-[10px] font-bold">
            +{students.length - 3}
          </div>
        )}
      </div>

      <div className="mt-4">
        <h2 className="text-8xl font-black">{count}</h2>
      </div>

      <div className="space-y-1">
        <p className="text-lg font-bold opacity-90">{percentage}% of class</p>
        <p className="text-sm font-medium opacity-70">grade avg: {gradeAvg}%</p>
      </div>
    </div>
  );
}
