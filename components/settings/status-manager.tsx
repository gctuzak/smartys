"use client";

import { useState } from "react";
import { 
  addProposalStatus, 
  updateProposalStatus, 
  deleteProposalStatus,
  addOrderStatus,
  updateOrderStatus,
  deleteOrderStatus,
  type StatusItem 
} from "@/app/actions/status-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, GripVertical } from "lucide-react";

interface StatusManagerProps {
  initialProposalStatuses: StatusItem[];
  initialOrderStatuses: StatusItem[];
}

export function StatusManager({ initialProposalStatuses, initialOrderStatuses }: StatusManagerProps) {
  const [activeTab, setActiveTab] = useState<"proposals" | "orders">("proposals");
  const [proposalStatuses, setProposalStatuses] = useState(initialProposalStatuses);
  const [orderStatuses, setOrderStatuses] = useState(initialOrderStatuses);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StatusItem | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    color: "#3b82f6",
    order: 0,
    isActive: true,
    isDefault: false
  });

  const handleTabChange = (tab: "proposals" | "orders") => {
    setActiveTab(tab);
    setEditingItem(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      color: "#3b82f6",
      order: 0,
      isActive: true,
      isDefault: false
    });
  };

  const openAddDialog = () => {
    setEditingItem(null);
    // Calculate next order number
    const currentList = activeTab === "proposals" ? proposalStatuses : orderStatuses;
    const maxOrder = currentList.length > 0 ? Math.max(...currentList.map(i => i.order)) : -1;
    
    setFormData({
      name: "",
      color: "#3b82f6",
      order: maxOrder + 1,
      isActive: true,
      isDefault: false
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: StatusItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      color: item.color,
      order: item.order,
      isActive: item.isActive,
      isDefault: item.isDefault
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (activeTab === "proposals") {
        if (editingItem) {
          const res = await updateProposalStatus(editingItem.id, formData);
          if (!res.success) throw new Error(res.error);
          setProposalStatuses(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...formData } : item).sort((a, b) => a.order - b.order));
          toast.success("Teklif durumu güncellendi");
        } else {
          const res = await addProposalStatus(formData);
          if (!res.success) throw new Error(res.error);
          // We can't easily get the ID back without refetching or returning it from server action.
          // For now, let's just reload the page or optimistically add if we had ID.
          // Since we are using revalidatePath, the page props won't update automatically in client component unless we refresh.
          // So the list might be stale.
          // Ideally, server action should return the new item.
          // For now, I'll just show success and rely on user refresh or I can implement router.refresh()
          toast.success("Teklif durumu eklendi");
          window.location.reload(); // Simple brute force refresh to get new data
        }
      } else {
        if (editingItem) {
          const res = await updateOrderStatus(editingItem.id, formData);
          if (!res.success) throw new Error(res.error);
          setOrderStatuses(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...formData } : item).sort((a, b) => a.order - b.order));
          toast.success("Sipariş durumu güncellendi");
        } else {
          const res = await addOrderStatus(formData);
          if (!res.success) throw new Error(res.error);
          toast.success("Sipariş durumu eklendi");
          window.location.reload();
        }
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bir hata oluştu");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu durumu silmek istediğinize emin misiniz?")) return;

    try {
      if (activeTab === "proposals") {
        const res = await deleteProposalStatus(id);
        if (!res.success) throw new Error(res.error);
        setProposalStatuses(prev => prev.filter(item => item.id !== id));
        toast.success("Teklif durumu silindi");
      } else {
        const res = await deleteOrderStatus(id);
        if (!res.success) throw new Error(res.error);
        setOrderStatuses(prev => prev.filter(item => item.id !== id));
        toast.success("Sipariş durumu silindi");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bir hata oluştu");
    }
  };

  const currentList = activeTab === "proposals" ? proposalStatuses : orderStatuses;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex space-x-2 bg-muted p-1 rounded-lg">
            <button
              onClick={() => handleTabChange("proposals")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "proposals" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:bg-background/50"
              }`}
            >
              Teklif Durumları
            </button>
            <button
              onClick={() => handleTabChange("orders")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "orders" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:bg-background/50"
              }`}
            >
              Sipariş Durumları
            </button>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Durum Ekle
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Durum Adı</TableHead>
                <TableHead>Renk</TableHead>
                <TableHead>Sıra</TableHead>
                <TableHead>Varsayılan</TableHead>
                <TableHead>Aktif</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Henüz bir durum tanımlanmamış.
                  </TableCell>
                </TableRow>
              ) : (
                currentList.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full border" 
                          style={{ backgroundColor: item.color }} 
                        />
                        <span className="text-muted-foreground text-xs uppercase">{item.color}</span>
                      </div>
                    </TableCell>
                    <TableCell>{item.order}</TableCell>
                    <TableCell>
                      {item.isDefault ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Evet
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                       {item.isActive ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Pasif
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Durumu Düzenle" : "Yeni Durum Ekle"}
            </DialogTitle>
            <DialogDescription>
              {activeTab === "proposals" ? "Teklif" : "Sipariş"} durumu için bilgileri giriniz.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Durum Adı</Label>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                required 
                placeholder="Örn: Onaylandı, Beklemede..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Renk</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    id="color" 
                    type="color" 
                    value={formData.color} 
                    onChange={(e) => setFormData({...formData, color: e.target.value})} 
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input 
                    value={formData.color} 
                    onChange={(e) => setFormData({...formData, color: e.target.value})} 
                    placeholder="#000000"
                    className="uppercase"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="order">Sıralama</Label>
                <Input 
                  id="order" 
                  type="number" 
                  value={formData.order} 
                  onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 0})} 
                  required 
                />
              </div>
            </div>

            <div className="flex items-center gap-8 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.isActive} 
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium">Aktif</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.isDefault} 
                  onChange={(e) => setFormData({...formData, isDefault: e.target.checked})}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium">Varsayılan</span>
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>İptal</Button>
              <Button type="submit">Kaydet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
