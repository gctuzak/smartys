'use client';

import { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { getRepresentativesAction } from "@/app/actions/fetch-data";
import { transferAndDeleteUserAction } from "@/app/actions/user-operations";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

interface TransferUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any; // The user to be deleted
  counts: {
    companies: number;
    persons: number;
    orders: number;
  };
  onSuccess: () => void;
}

export function TransferUserModal({ isOpen, onClose, user, counts, onSuccess }: TransferUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  const fetchUsers = useCallback(async (search = "") => {
    setLoading(true);
    const result = await getRepresentativesAction(1, 50, search);
    if (result.success) {
      // Filter out the current user from the list
      const filteredUsers = (result.data || []).filter((u: any) => u.id !== user?.id);
      setUsers(filteredUsers);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setSelectedUserId("");
    }
  }, [isOpen, fetchUsers]);

  const handleUserSearch = useCallback((search: string) => {
    fetchUsers(search);
  }, [fetchUsers]);

  const handleTransferAndDelete = async () => {
    if (!selectedUserId) {
      toast.error("Lütfen bir kullanıcı seçin");
      return;
    }

    if (!confirm("Kayıtlar aktarılacak ve kullanıcı silinecek. Onaylıyor musunuz?")) return;

    setTransferLoading(true);
    try {
      const result = await transferAndDeleteUserAction(user.id, selectedUserId);
      if (result.success) {
        toast.success("Kayıtlar aktarıldı ve kullanıcı silindi");
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || "İşlem başarısız");
      }
    } catch (error) {
      toast.error("Beklenmedik bir hata oluştu");
    } finally {
      setTransferLoading(false);
    }
  };

  const userOptions = users.map(u => ({
    label: `${u.first_name} ${u.last_name}`,
    value: u.id
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kullanıcı Kayıtlarını Aktar"
    >
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">Bu kullanıcıya bağlı kayıtlar bulundu:</p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              {counts.companies > 0 && <li>{counts.companies} Şirket</li>}
              {counts.persons > 0 && <li>{counts.persons} Kişi</li>}
              {counts.orders > 0 && <li>{counts.orders} Sipariş</li>}
            </ul>
            <p className="mt-2">
              Silme işlemini tamamlamak için bu kayıtların aktarılacağı yeni bir temsilci seçmelisiniz.
            </p>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Yeni Temsilci Seçin</label>
          <Combobox
            options={userOptions}
            value={selectedUserId}
            onChange={setSelectedUserId}
            placeholder="Temsilci seçiniz..."
            searchPlaceholder="Temsilci ara..."
            emptyText="Temsilci bulunamadı."
            onSearch={handleUserSearch}
            loading={loading}
          />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={transferLoading}>
            İptal
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleTransferAndDelete} 
            disabled={!selectedUserId || transferLoading}
          >
            {transferLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Aktar ve Sil
          </Button>
        </div>
      </div>
    </Modal>
  );
}
