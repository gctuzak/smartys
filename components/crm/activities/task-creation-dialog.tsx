"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarIcon, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import {
  createActivity,
  getActivityOptions,
  updateActivity,
  type Activity,
} from "@/app/actions/activities";
import { createActivitySchema } from "@/lib/schemas/activities";
import { parseDate } from "@/lib/utils";

// Extend schema for form usage if needed, or use as is
const formSchema = createActivitySchema;
type FormValues = z.input<typeof formSchema>;

interface TaskCreationDialogProps {
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  activityToEdit?: Activity;
  initialData?: {
    companyId?: string | null;
    companyName?: string | null;
    contactId?: string | null;
    contactName?: string | null;
    proposalId?: string | null;
    proposalTitle?: string | null;
    assignedTo?: string | null;
  };
}

export function TaskCreationDialog({
  trigger,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
  activityToEdit,
  initialData,
}: TaskCreationDialogProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [options, setOptions] = useState<{
    users: { value: string; label: string }[];
    persons: { value: string; label: string; companyId?: string }[];
    companies: { value: string; label: string }[];
    proposals: { value: string; label: string; companyId?: string; contactId?: string }[];
    types: { value: string; label: string }[];
  }>({ users: [], persons: [], companies: [], proposals: [], types: [] });

  const formatDateForInput = (date?: Date | string | null) => {
    const d = parseDate(date);
    if (!d) return undefined;

    // Force TRT (UTC+3)
    const trOffset = 3 * 60; // minutes
    const shifted = new Date(d.getTime() + trOffset * 60000);
    return shifted.toISOString().slice(0, 16);
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: activityToEdit?.type?.toUpperCase() || "TASK",
      subject: activityToEdit?.subject || "",
      description: activityToEdit?.description || "",
      priority: activityToEdit?.priority || "MEDIUM",
      dueDate: formatDateForInput(activityToEdit?.dueDate),
      assignedTo: activityToEdit?.assignedTo || initialData?.assignedTo || undefined,
      contactId: activityToEdit?.contactId || initialData?.contactId || undefined,
      companyId: activityToEdit?.companyId || initialData?.companyId || undefined,
      proposalId: activityToEdit?.proposalId || initialData?.proposalId || undefined,
      isRecurring: activityToEdit?.isRecurring || false,
      status: activityToEdit?.status || "OPEN",
    },
  });

  const watchedCompanyId = watch("companyId");
  const watchedContactId = watch("contactId");
  const watchedProposalId = watch("proposalId");

  const filteredPersons = options.persons.filter(p => {
    if (watchedCompanyId && p.companyId && p.companyId !== watchedCompanyId) return false;
    return true;
  });

  const filteredProposals = options.proposals.filter(p => {
    if (watchedCompanyId) {
      if (p.companyId !== watchedCompanyId) return false;
    }
    if (watchedContactId) {
      if (p.contactId !== watchedContactId) return false;
    }
    return true;
  });

  // Auto-select Company when Person is selected
  useEffect(() => {
    if (watchedContactId) {
      const person = options.persons.find(p => p.value === watchedContactId);
      if (person?.companyId && !watchedCompanyId) {
        setValue("companyId", person.companyId);
      }
    }
  }, [watchedContactId, options.persons, setValue, watchedCompanyId]);

  // Auto-select Company and Person when Proposal is selected
  useEffect(() => {
    if (watchedProposalId) {
      const proposal = options.proposals.find(p => p.value === watchedProposalId);
      if (proposal?.companyId && !watchedCompanyId) {
        setValue("companyId", proposal.companyId);
      }
      if (proposal?.contactId && !watchedContactId) {
        setValue("contactId", proposal.contactId);
      }
    }
  }, [watchedProposalId, options.proposals, setValue, watchedCompanyId, watchedContactId]);

  // Pre-populate options from initialData
  useEffect(() => {
    if (initialData) {
      setOptions(prev => {
        const newOptions = { ...prev };
        let changed = false;

        if (initialData.companyId && initialData.companyName && !newOptions.companies.some(c => c.value === initialData.companyId)) {
          newOptions.companies = [...newOptions.companies, { value: initialData.companyId, label: initialData.companyName }];
          changed = true;
        }

        if (initialData.contactId && initialData.contactName && !newOptions.persons.some(p => p.value === initialData.contactId)) {
          newOptions.persons = [...newOptions.persons, { value: initialData.contactId, label: initialData.contactName, companyId: initialData.companyId || undefined }];
          changed = true;
        }

        if (initialData.proposalId && initialData.proposalTitle && !newOptions.proposals.some(p => p.value === initialData.proposalId)) {
          newOptions.proposals = [...newOptions.proposals, { 
            value: initialData.proposalId, 
            label: initialData.proposalTitle,
            companyId: initialData.companyId || undefined,
            contactId: initialData.contactId || undefined
          }];
          changed = true;
        }

        return changed ? newOptions : prev;
      });
    }
  }, [initialData]);

  // Reset form when activityToEdit or initialData changes
  useEffect(() => {
    if (activityToEdit) {
      const type = activityToEdit.type?.trim().toUpperCase() || "TASK";
      reset({
        type,
        subject: activityToEdit.subject,
        description: activityToEdit.description || "",
        priority: activityToEdit.priority,
        dueDate: formatDateForInput(activityToEdit.dueDate),
        assignedTo: activityToEdit.assignedTo,
        contactId: activityToEdit.contactId,
        companyId: activityToEdit.companyId,
        proposalId: activityToEdit.proposalId,
        isRecurring: activityToEdit.isRecurring || false,
        status: activityToEdit.status,
      });
    } else if (initialData && !activityToEdit) {
       reset({
        type: "TASK",
        subject: initialData.proposalTitle ? `${initialData.proposalTitle} ile ilgili görev` : "",
        description: "",
        priority: "MEDIUM",
        dueDate: undefined,
        assignedTo: initialData.assignedTo || undefined,
        contactId: initialData.contactId || undefined,
        companyId: initialData.companyId || undefined,
        proposalId: initialData.proposalId || undefined,
        isRecurring: false,
        status: "OPEN",
      });
    }
  }, [activityToEdit, initialData, reset]);


  const isRecurring = watch("isRecurring");

  useEffect(() => {
    if (open) {
      setOptionsLoading(true);
      getActivityOptions().then((res) => {
        if (res.success && res.data) {
          setOptions(prev => {
             // Merge fetched options with initialData options to ensure we don't lose the pre-selected ones
             const newOptions = { ...res.data! };
             
             // Ensure types are standardized
             if (newOptions.types) {
                newOptions.types = newOptions.types.map(t => ({
                    ...t,
                    value: t.value.trim().toUpperCase()
                }));
             }
             
             if (initialData) {
                if (initialData.companyId && initialData.companyName && !newOptions.companies.some(c => c.value === initialData.companyId)) {
                  newOptions.companies = [...newOptions.companies, { value: initialData.companyId, label: initialData.companyName }];
                }

                if (initialData.contactId && initialData.contactName && !newOptions.persons.some(p => p.value === initialData.contactId)) {
                  newOptions.persons = [...newOptions.persons, { value: initialData.contactId, label: initialData.contactName, companyId: initialData.companyId || undefined }];
                }

                if (initialData.proposalId && initialData.proposalTitle && !newOptions.proposals.some(p => p.value === initialData.proposalId)) {
                  newOptions.proposals = [...newOptions.proposals, { 
                    value: initialData.proposalId, 
                    label: initialData.proposalTitle,
                    companyId: initialData.companyId || undefined,
                    contactId: initialData.contactId || undefined
                  }];
                }
             }
             return newOptions;
          });
        }
      }).catch(err => console.error("Error calling getActivityOptions:", err))
      .finally(() => setOptionsLoading(false));
    }
  }, [open, initialData]);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      let result;
      if (activityToEdit) {
        result = await updateActivity(activityToEdit.id, data);
      } else {
        result = await createActivity(data);
      }

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        reset();
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Görev Oluştur
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{activityToEdit ? "Aktiviteyi Düzenle" : "Yeni Aktivite / Görev"}</DialogTitle>
          <DialogDescription>
            {activityToEdit ? "Mevcut aktivite detaylarını güncelleyin." : "Yeni bir görev, arama veya toplantı kaydı oluşturun."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Aktivite Türü</label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <select
                    {...field}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={field.value || "TASK"}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  >
                    {options.types && options.types.length > 0 ? (
                      options.types.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="TASK">Görev (Task)</option>
                        <option value="CALL">Arama (Call)</option>
                        <option value="MEETING">Toplantı (Meeting)</option>
                        <option value="EMAIL">E-posta (Email)</option>
                        <option value="NOTE">Not (Note)</option>
                      </>
                    )}
                  </select>
                )}
              />
              {errors.type && (
                <p className="text-xs text-red-500">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Durum</label>
              <select
                {...register("status")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="OPEN">Açık</option>
                <option value="IN_PROGRESS">Devam Ediyor</option>
                <option value="COMPLETED">Tamamlandı</option>
                <option value="CANCELED">İptal Edildi</option>
              </select>
              {errors.status && (
                <p className="text-xs text-red-500">{errors.status.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Öncelik</label>
              <select
                {...register("priority")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="LOW">Düşük</option>
                <option value="MEDIUM">Orta</option>
                <option value="HIGH">Yüksek</option>
              </select>
              {errors.priority && (
                <p className="text-xs text-red-500">{errors.priority.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Konu *</label>
            <Input {...register("subject")} placeholder="Örn: Müşteri takibi" />
            {errors.subject && (
              <p className="text-xs text-red-500">{errors.subject.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Açıklama</label>
            <textarea
              {...register("description")}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Detaylı açıklama..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Son Tarih</label>
              <Input
                type="datetime-local"
                {...register("dueDate")}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Atanan Kişi *</label>
              <Combobox
                options={options.users}
                value={watch("assignedTo")}
                onChange={(val) => setValue("assignedTo", val, { shouldValidate: true, shouldDirty: true })}
                placeholder="Kullanıcı Seç..."
                searchPlaceholder="Kullanıcı ara..."
                loading={optionsLoading}
                modal
              />
              {errors.assignedTo && (
                <p className="text-xs text-red-500">{errors.assignedTo.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">İlişkiler</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">İlgili Kişi</label>
                <Combobox
                  options={filteredPersons}
                  value={watch("contactId") || undefined}
                  onChange={(val) => setValue("contactId", val || null, { shouldValidate: true, shouldDirty: true })}
                  placeholder="Kişi Seç..."
                  searchPlaceholder="Kişi ara..."
                  loading={optionsLoading}
                  modal
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">İlgili Firma</label>
                <Combobox
                  options={options.companies}
                  value={watch("companyId") || undefined}
                  onChange={(val) => setValue("companyId", val || null, { shouldValidate: true, shouldDirty: true })}
                  placeholder="Firma Seç..."
                  searchPlaceholder="Firma ara..."
                  loading={optionsLoading}
                  modal
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">İlgili Teklif</label>
              <Combobox
                options={filteredProposals}
                value={watch("proposalId") || undefined}
                onChange={(val) => setValue("proposalId", val || null, { shouldValidate: true, shouldDirty: true })}
                placeholder="Teklif Seç..."
                searchPlaceholder="Teklif ara..."
                loading={optionsLoading}
                modal
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="isRecurring"
              {...register("isRecurring")}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="isRecurring" className="text-sm font-medium">
              Tekrarlayan Görev (Gelişmiş)
            </label>
          </div>
          
          {isRecurring && (
            <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
              Tekrarlama kuralları şu an için sadece basit tekrarları destekler. (Geliştirme aşamasında)
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
