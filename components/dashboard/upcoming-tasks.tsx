import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Calendar, CheckCircle2, Clock } from "lucide-react";

interface UpcomingTasksProps {
  tasks: any[];
}

export function UpcomingTasks({ tasks }: UpcomingTasksProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Yaklaşan Görevler</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Yaklaşan görev bulunmuyor.
            </p>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="flex items-start space-x-4 p-3 border rounded-lg bg-gray-50/50">
                <div className={`mt-0.5 p-1.5 rounded-full 
                  ${task.priority === 'HIGH' ? 'bg-red-100 text-red-600' : 
                    task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-600' : 
                    'bg-blue-100 text-blue-600'}`}>
                  {task.status === 'COMPLETED' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {task.subject}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {task.companies?.name}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {task.due_date ? format(new Date(task.due_date), "d MMM", { locale: tr }) : 'Tarihsiz'}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
