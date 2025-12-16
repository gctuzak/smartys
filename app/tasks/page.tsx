import { ActivityTimeline } from "@/components/crm/activities/activity-timeline";

export default function TasksPage() {
  return (
    <div className="flex flex-col h-full space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Görevler ve Aktiviteler</h2>
          <p className="text-muted-foreground">
            Tüm görevlerinizi, toplantılarınızı ve notlarınızı buradan takip edebilirsiniz.
          </p>
        </div>
      </div>
      
      <div className="flex-1 bg-white rounded-lg border p-6 shadow-sm">
        <ActivityTimeline />
      </div>
    </div>
  );
}
