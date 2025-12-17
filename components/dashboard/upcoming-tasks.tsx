"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Calendar, CheckCircle2, Clock } from "lucide-react";
import { TaskCreationDialog } from "@/components/crm/activities/task-creation-dialog";
import { CompanyModal } from "@/components/companies/company-modal";

interface UpcomingTasksProps {
  tasks: any[];
}

export function UpcomingTasks({ tasks }: UpcomingTasksProps) {
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  const handleTaskClick = (task: any) => {
    // Transform task data to match Activity interface if needed
    // Assuming task structure matches roughly what TaskCreationDialog expects
    const activityToEdit = {
      id: task.id,
      type: "TASK", // Default to TASK as these are upcoming tasks
      subject: task.subject,
      description: task.description,
      priority: task.priority,
      dueDate: task.due_date,
      status: task.status,
      assignedTo: task.assigned_to,
      contactId: task.contact_id,
      companyId: task.company_id,
      proposalId: task.proposal_id,
      // Add other fields if available in tasks
    };
    setSelectedTask(activityToEdit);
    setIsTaskDialogOpen(true);
  };

  const handleCompanyClick = (e: React.MouseEvent, company: any) => {
    e.stopPropagation();
    if (company) {
      setSelectedCompany(company);
      setIsCompanyModalOpen(true);
    }
  };

  return (
    <>
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
                <div 
                  key={task.id} 
                  className="flex items-start space-x-4 p-3 border rounded-lg bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleTaskClick(task)}
                >
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
                    <p 
                      className="text-xs text-muted-foreground hover:text-blue-600 hover:underline inline-block"
                      onClick={(e) => handleCompanyClick(e, task.companies)}
                    >
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

      {isTaskDialogOpen && (
        <TaskCreationDialog
          open={isTaskDialogOpen}
          onOpenChange={setIsTaskDialogOpen}
          activityToEdit={selectedTask}
          onSuccess={() => {
            // Optional: refresh data
            window.location.reload(); 
          }}
        />
      )}

      {selectedCompany && (
        <CompanyModal
          isOpen={isCompanyModalOpen}
          onClose={() => setIsCompanyModalOpen(false)}
          company={selectedCompany}
          onSuccess={() => {}}
        />
      )}
    </>
  );
}
