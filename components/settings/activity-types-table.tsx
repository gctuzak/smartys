"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  createActivityTypeSchema, 
  type CreateActivityTypeInput 
} from "@/lib/schemas/activity-types";
import { createActivityType, updateActivityType, deleteActivityType } from "@/app/actions/activity-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface ActivityType {
  id: string;
  name: string;
  label: string;
  color: string | null;
  isActive: boolean;
}

interface ActivityTypesTableProps {
  initialTypes: ActivityType[];
}

export function ActivityTypesTable({ initialTypes }: ActivityTypesTableProps) {
  const [types, setTypes] = useState(initialTypes);
  const [isOpen, setIsOpen] = useState(false);
  const [editingType, setEditingType] = useState<ActivityType | null>(null);
  const [sortField, setSortField] = useState<keyof ActivityType>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateActivityTypeInput>({
    resolver: zodResolver(createActivityTypeSchema),
    defaultValues: {
      name: "",
      label: "",
      color: "#3b82f6",
      isActive: true,
    },
  });

  const watchedColor = watch("color");

  const sortedTypes = useMemo(() => {
    return [...types].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      return 0;
    });
  }, [types, sortField, sortOrder]);

  const handleSort = (field: keyof ActivityType) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ field }: { field: keyof ActivityType }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortOrder === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const onSubmit = async (data: CreateActivityTypeInput) => {
    try {
      if (editingType) {
        const result = await updateActivityType({ ...data, id: editingType.id });
        if (result.success) {
          toast.success("Aktivite türü güncellendi");
          setIsOpen(false);
          window.location.reload(); 
        } else {
          toast.error(result.error);
        }
      } else {
        const result = await createActivityType(data);
        if (result.success) {
          toast.success("Aktivite türü oluşturuldu");
          setIsOpen(false);
          window.location.reload();
        } else {
          toast.error(result.error);
        }
      }
    } catch (error) {
      toast.error("Bir hata oluştu");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu türü silmek istediğinize emin misiniz?")) return;
    
    const result = await deleteActivityType(id);
    if (result.success) {
      toast.success("Aktivite türü silindi");
      window.location.reload();
    } else {
      toast.error(result.error);
    }
  };

  const openEdit = (type: ActivityType) => {
    setEditingType(type);
    reset({
      name: type.name,
      label: type.label,
      color: type.color || "#3b82f6",
      isActive: type.isActive,
    });
    setIsOpen(true);
  };

  const openCreate = () => {
    setEditingType(null);
    reset({
        name: "",
        label: "",
        color: "#3b82f6",
        isActive: true,
    });
    setIsOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Aktivite Türleri</h2>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Tür Ekle
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingType ? "Türü Düzenle" : "Yeni Tür Ekle"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Kod (Name)</label>
              <Input {...register("name")} placeholder="TASK" disabled={!!editingType} />
              {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
              <p className="text-xs text-gray-500">Sistem içinde kullanılacak benzersiz kod (örn: CALL, MEETING)</p>
            </div>
            <div>
              <label className="text-sm font-medium">Görünen İsim (Label)</label>
              <Input {...register("label")} placeholder="Görev" />
              {errors.label && <p className="text-red-500 text-xs">{errors.label.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Renk</label>
              <div className="flex gap-2">
                <Input 
                  type="color" 
                  value={watchedColor || "#3b82f6"} 
                  onChange={(e) => setValue("color", e.target.value)}
                  className="w-12 p-1 h-10" 
                />
                <Input {...register("color")} placeholder="#3b82f6" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>İptal</Button>
              <Button type="submit">Kaydet</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => handleSort("name")} className="cursor-pointer hover:bg-gray-100">
                <div className="flex items-center">
                  Kod <SortIcon field="name" />
                </div>
              </TableHead>
              <TableHead onClick={() => handleSort("label")} className="cursor-pointer hover:bg-gray-100">
                <div className="flex items-center">
                  İsim <SortIcon field="label" />
                </div>
              </TableHead>
              <TableHead onClick={() => handleSort("color")} className="cursor-pointer hover:bg-gray-100">
                <div className="flex items-center">
                  Renk <SortIcon field="color" />
                </div>
              </TableHead>
              <TableHead className="w-[100px]">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTypes.map((type) => (
              <TableRow key={type.id}>
                <TableCell className="font-medium">{type.name}</TableCell>
                <TableCell>{type.label}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: type.color || "#ccc" }} />
                    {type.color}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(type)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(type.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {types.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                  Henüz aktivite türü eklenmemiş.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
