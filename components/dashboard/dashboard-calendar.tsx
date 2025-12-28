
"use client";

import { useState, useEffect } from "react";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  addWeeks, 
  subWeeks, 
  isToday 
} from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle2, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCalendarActivities } from "@/app/actions/dashboard";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type ViewType = "week" | "month";

interface Activity {
  id: string;
  subject: string;
  type: string;
  status: string;
  due_date: string;
  priority?: string;
  companies?: { name: string } | null;
  persons?: { first_name: string; last_name: string } | null;
}

export function DashboardCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>("week");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch data when date or view changes
  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        let start, end;
        
        if (view === "week") {
          start = startOfWeek(currentDate, { locale: tr, weekStartsOn: 1 }); // Monday start
          end = endOfWeek(currentDate, { locale: tr, weekStartsOn: 1 });
        } else {
          start = startOfMonth(currentDate);
          end = endOfMonth(currentDate);
          
          // Extend to full weeks for the grid
          start = startOfWeek(start, { locale: tr, weekStartsOn: 1 });
          end = endOfWeek(end, { locale: tr, weekStartsOn: 1 });
        }

        const data = await getCalendarActivities(start, end);
        setActivities(data as Activity[]);
      } catch (error) {
        console.error("Error fetching calendar activities:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [currentDate, view]);

  const handlePrevious = () => {
    if (view === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (view === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "MEETING": return "bg-purple-100 text-purple-700 border-purple-200";
      case "CALL": return "bg-blue-100 text-blue-700 border-blue-200";
      case "TASK": return "bg-green-100 text-green-700 border-green-200";
      case "EMAIL": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "MEETING": return "Toplantı";
      case "CALL": return "Arama";
      case "TASK": return "Görev";
      case "EMAIL": return "E-posta";
      default: return type;
    }
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { locale: tr, weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { locale: tr, weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border">
        {days.map((day) => {
          const dayActivities = activities.filter(a => isSameDay(new Date(a.due_date), day));
          const isTodayDate = isToday(day);

          return (
            <div key={day.toString()} className="bg-white min-h-[300px] flex flex-col">
              <div className={cn(
                "p-2 text-center border-b",
                isTodayDate ? "bg-blue-50" : "bg-gray-50"
              )}>
                <div className="text-xs text-gray-500 font-medium uppercase">
                  {format(day, "EEEE", { locale: tr })}
                </div>
                <div className={cn(
                  "text-lg font-semibold mt-1 w-8 h-8 flex items-center justify-center mx-auto rounded-full",
                  isTodayDate ? "bg-blue-600 text-white" : "text-gray-900"
                )}>
                  {format(day, "d")}
                </div>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[400px]">
                {dayActivities.map(activity => (
                  <div 
                    key={activity.id}
                    className={cn(
                      "p-2 rounded border text-xs shadow-sm cursor-pointer hover:shadow-md transition-shadow",
                      getTypeColor(activity.type),
                      activity.status === "COMPLETED" && "opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold truncate">{activity.subject}</span>
                      {activity.status === "COMPLETED" && <CheckCircle2 className="w-3 h-3" />}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] opacity-80 mb-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(activity.due_date), "HH:mm")}
                    </div>
                    {(activity.companies || activity.persons) && (
                      <div className="truncate opacity-90 font-medium">
                        {activity.companies?.name || `${activity.persons?.first_name} ${activity.persons?.last_name}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { locale: tr, weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { locale: tr, weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Days of week header
    const weekDays = eachDayOfInterval({ 
      start: startOfWeek(new Date(), { locale: tr, weekStartsOn: 1 }), 
      end: endOfWeek(new Date(), { locale: tr, weekStartsOn: 1 }) 
    });

    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {weekDays.map(day => (
            <div key={day.toString()} className="p-2 text-center text-xs font-semibold text-gray-500 uppercase">
              {format(day, "EEEE", { locale: tr })}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {days.map((day) => {
            const dayActivities = activities.filter(a => isSameDay(new Date(a.due_date), day));
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);

            return (
              <div 
                key={day.toString()} 
                className={cn(
                  "bg-white min-h-[100px] p-2 flex flex-col hover:bg-gray-50 transition-colors",
                  !isCurrentMonth && "bg-gray-50/50 text-gray-400"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={cn(
                    "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    isTodayDate ? "bg-blue-600 text-white" : ""
                  )}>
                    {format(day, "d")}
                  </span>
                  {dayActivities.length > 0 && (
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 rounded-full">
                      {dayActivities.length}
                    </span>
                  )}
                </div>
                <div className="space-y-1 overflow-hidden">
                  {dayActivities.slice(0, 3).map(activity => (
                    <Popover key={activity.id}>
                      <PopoverTrigger asChild>
                        <div className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded truncate border cursor-pointer hover:opacity-80",
                          getTypeColor(activity.type),
                          activity.status === "COMPLETED" && "line-through opacity-60"
                        )}>
                           {format(new Date(activity.due_date), "HH:mm")} {activity.subject}
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 text-xs p-3">
                        <p className="font-bold mb-1">{activity.subject}</p>
                        <p className="text-gray-500 mb-1">{format(new Date(activity.due_date), "dd MMMM HH:mm")} - {getTypeLabel(activity.type)}</p>
                        {(activity.companies || activity.persons) && (
                           <p className="text-xs italic bg-gray-50 p-1 rounded">
                             {activity.companies?.name || `${activity.persons?.first_name} ${activity.persons?.last_name}`}
                           </p>
                        )}
                        {activity.status === "COMPLETED" && <Badge variant="secondary" className="mt-2 text-[10px]">Tamamlandı</Badge>}
                      </PopoverContent>
                    </Popover>
                  ))}
                  {dayActivities.length > 3 && (
                    <div className="text-[10px] text-gray-500 pl-1">
                      + {dayActivities.length - 3} daha...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            {format(currentDate, "MMMM yyyy", { locale: tr })}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-2">
            <button
              onClick={() => setView("week")}
              className={cn(
                "px-3 py-1 text-sm font-medium rounded-md transition-all",
                view === "week" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Hafta
            </button>
            <button
              onClick={() => setView("month")}
              className={cn(
                "px-3 py-1 text-sm font-medium rounded-md transition-all",
                view === "month" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Ay
            </button>
          </div>

          <Button variant="outline" size="icon" onClick={handlePrevious}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={handleToday}>
            Bugün
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="h-[400px] flex items-center justify-center border rounded-lg bg-gray-50">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        view === "week" ? renderWeekView() : renderMonthView()
      )}
    </div>
  );
}
