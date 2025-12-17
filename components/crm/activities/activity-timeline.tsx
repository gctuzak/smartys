"use client";

import { useEffect, useState, useCallback } from "react";
import { format, isToday, isYesterday, isThisWeek, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import {
  CheckCircle2,
  Circle,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Calendar,
  FileText,
  AlertCircle,
  MoreHorizontal,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  getActivities,
  updateActivityStatus,
  deleteActivity,
  Activity,
} from "@/app/actions/activities";
import { cn } from "@/lib/utils";
import { TaskCreationDialog } from "./task-creation-dialog";

interface ActivityTimelineProps {
  contactId?: string;
  contactName?: string;
  companyId?: string;
  companyName?: string;
  proposalId?: string;
  proposalTitle?: string;
  representativeId?: string;
}

type GroupedActivities = {
  [key: string]: Activity[];
};

export function ActivityTimeline({
  contactId,
  contactName,
  companyId,
  companyName,
  proposalId,
  proposalTitle,
  representativeId,
}: ActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    const result = await getActivities({ contactId, companyId, proposalId });
    if (result.success && result.data) {
      setActivities(result.data);
    } else {
      toast.error("Aktiviteler yüklenemedi.");
    }
    setLoading(false);
  }, [contactId, companyId, proposalId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu aktiviteyi silmek istediğinize emin misiniz?")) return;
    
    // Optimistic remove? Maybe risky if fails.
    // Just call API
    const result = await deleteActivity(id);
    if (result.success) {
      toast.success("Aktivite silindi.");
      setActivities(prev => prev.filter(a => a.id !== id));
    } else {
      toast.error(result.error);
    }
  };


  const handleStatusChange = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "COMPLETED" ? "OPEN" : "COMPLETED";
    // Optimistic update
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );

    const result = await updateActivityStatus(id, newStatus);
    if (!result.success) {
      toast.error(result.error);
      // Revert
      setActivities((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: currentStatus } : a))
      );
    } else {
      toast.success(
        newStatus === "COMPLETED" ? "Aktivite tamamlandı." : "Aktivite açıldı."
      );
    }
  };

  const getIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case "CALL":
        return <Phone className="h-4 w-4" />;
      case "MEETING":
        return <Calendar className="h-4 w-4" />;
      case "EMAIL":
        return <Mail className="h-4 w-4" />;
      case "NOTE":
        return <FileText className="h-4 w-4" />;
      case "TASK":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        // Handle custom types or fallback
        return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
      if (!type) {
        console.warn("Activity type is missing", type);
        return "Belirsiz";
      }
      switch (type.trim().toUpperCase()) {
        case "CALL": return "Arama";
        case "MEETING": return "Toplantı";
        case "EMAIL": return "E-posta";
        case "NOTE": return "Not";
        case "TASK": return "Görev";
        default: return type; // Show raw type if not standard, or map from activity_types if available
      }
  };


  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "HIGH":
        return "text-red-500 bg-red-50 border-red-200";
      case "MEDIUM":
        return "text-amber-500 bg-amber-50 border-amber-200";
      case "LOW":
        return "text-blue-500 bg-blue-50 border-blue-200";
      default:
        return "text-gray-500 bg-gray-50 border-gray-200";
    }
  };

  const groupActivities = (list: Activity[]) => {
    const groups: GroupedActivities = {
      "Yaklaşan / Bugün": [],
      "Dün": [],
      "Bu Hafta": [],
      "Daha Eski": [],
    };

    list.forEach((activity) => {
      const date = activity.createdAt ? new Date(activity.createdAt) : new Date();
      // Use due date for grouping if available? Or created at?
      // Timeline usually sorts by occurrence. CreatedAt is safe.
      // Or DueDate if it's a task.
      // I'll use CreatedAt for the "Timeline" feel of history, or DueDate for "Plan".
      // "Activity Timeline" usually implies history + future tasks.
      // I'll sort by CreatedAt descending (default from DB).

      if (isToday(date)) {
        groups["Yaklaşan / Bugün"].push(activity);
      } else if (isYesterday(date)) {
        groups["Dün"].push(activity);
      } else if (isThisWeek(date)) {
        groups["Bu Hafta"].push(activity);
      } else {
        groups["Daha Eski"].push(activity);
      }
    });

    // Remove empty groups
    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  };

  const grouped = groupActivities(activities);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Aktiviteler & Görevler</h3>
        <TaskCreationDialog 
          onSuccess={fetchActivities} 
          initialData={{
            companyId,
            companyName,
            contactId,
            contactName,
            proposalId,
            proposalTitle,
            assignedTo: representativeId
          }}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/10">
          <p>Henüz bir aktivite bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([groupName, items]) => (
            <div key={groupName} className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background/95 backdrop-blur py-1 z-10">
                {groupName}
              </h4>
              <div className="space-y-3 pl-2 border-l-2 border-muted ml-2">
                {items.map((activity) => (
                  <div
                    key={activity.id}
                    className={cn(
                      "relative flex flex-col gap-2 rounded-lg border p-3 text-sm transition-all hover:bg-muted/50 ml-4",
                      activity.status === "COMPLETED" && "opacity-60 bg-muted/20"
                    )}
                  >
                    {/* Timeline Dot */}
                    <div className="absolute -left-[25px] top-4 h-4 w-4 rounded-full border bg-background flex items-center justify-center">
                      <div className={cn("h-2 w-2 rounded-full", 
                        activity.status === "COMPLETED" ? "bg-green-500" : "bg-primary"
                      )} />
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("p-1.5 rounded-md", getPriorityColor(activity.priority))}>
                          {getIcon(activity.type)}
                        </span>
                        <div className="flex flex-col">
                          <span className={cn("font-medium", activity.status === "COMPLETED" && "line-through")}>
                            {activity.subject}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            <span className="font-semibold text-primary/80">
                              {getTypeLabel(activity.type)}
                            </span> • {format(new Date(activity.createdAt), "d MMMM yyyy HH:mm", { locale: tr })}
                            {activity.assignedToUser && ` • ${activity.assignedToUser.firstName || ''} ${activity.assignedToUser.lastName || ''}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => setEditingActivity(activity)}
                          title="Düzenle"
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => handleDelete(activity.id)}
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => handleStatusChange(activity.id, activity.status || "OPEN")}
                          title={activity.status === "COMPLETED" ? "Aç" : "Tamamla"}
                        >
                          {activity.status === "COMPLETED" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {activity.description && (
                      <p className="text-muted-foreground line-clamp-2 pl-9 text-xs">
                        {activity.description}
                      </p>
                    )}
                    
                    {/* Related Entity Chips */}
                    <div className="flex flex-wrap gap-2 pl-9 mt-1">
                       {activity.contact && (
                         <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                           👤 {activity.contact.firstName} {activity.contact.lastName}
                         </span>
                       )}
                       {activity.company && (
                         <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                           🏢 {activity.company.name}
                         </span>
                       )}
                       {activity.proposal && (
                         <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                           📄 Teklif #{activity.proposal.proposalNo}
                         </span>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editingActivity && (
        <TaskCreationDialog
          open={!!editingActivity}
          onOpenChange={(open) => !open && setEditingActivity(null)}
          activityToEdit={editingActivity}
          onSuccess={() => {
            setEditingActivity(null);
            fetchActivities();
          }}
        />
      )}
    </div>
  );
}
