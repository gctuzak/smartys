"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { Calendar, Clock, CheckCircle2 } from "lucide-react";
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Yaklaşan Görevler</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Yaklaşan görev bulunmuyor.
            </div>
          ) : (
            tasks.map((task) => (
              <div 
                key={task.id} 
                className="flex items-start space-x-4 p-4 hover:bg-gray-50/50 transition-colors cursor-pointer group"
                onClick={() => handleTaskClick(task)}
              >
                <div className={`mt-1 p-2 rounded-lg shrink-0 
                  ${task.priority === 'HIGH' ? 'bg-red-50 text-red-600' : 
                    task.priority === 'MEDIUM' ? 'bg-yellow-50 text-yellow-600' : 
                    'bg-blue-50 text-blue-600'}`}>
                  {task.status === 'COMPLETED' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {task.subject}
                  </p>
                  <p 
                    className="text-xs text-gray-500 mt-1 hover:text-blue-600 hover:underline inline-block truncate"
                    onClick={(e) => handleCompanyClick(e, task.companies)}
                  >
                    {task.companies?.name}
                  </p>
                </div>
                <div className="text-xs font-medium text-gray-400 whitespace-nowrap flex items-center bg-gray-50 px-2 py-1 rounded-md">
                  <Calendar className="w-3 h-3 mr-1.5" />
                  {formatDate(task.due_date, "d MMM")}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isTaskDialogOpen && (
        <TaskCreationDialog
          open={isTaskDialogOpen}
          onOpenChange={setIsTaskDialogOpen}
          activityToEdit={selectedTask}
          onSuccess={() => {
            setIsTaskDialogOpen(false);
            setSelectedTask(null);
            // Ideally trigger a refresh here, but page refresh will happen on navigation or similar
          }}
        />
      )}

      {isCompanyModalOpen && selectedCompany && (
        <CompanyModal
          isOpen={isCompanyModalOpen}
          onClose={() => {
            setIsCompanyModalOpen(false);
            setSelectedCompany(null);
          }}
          companyId={selectedCompany.id}
        />
      )}
    </>
  );
}
