import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export default function Scheduler() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Quiz Scheduler</h1>
          <p className="text-gray-400">Schedule automatic quiz posts to your Telegram channel</p>
        </div>

        <Card className="bg-slate-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Coming Soon</span>
            </CardTitle>
            <CardDescription>
              Automated quiz scheduling will be available soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400">
              You'll be able to schedule daily quizzes, set custom timing, and manage your content calendar from here.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
