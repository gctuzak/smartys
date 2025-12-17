'use client';

import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, User, Trash2, Edit, Plus, UserPlus, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUsersAction, deleteUserAction } from "@/app/actions/fetch-data";
import { checkUserDependenciesAction } from "@/app/actions/user-operations";
import { UserModal } from "@/components/users/user-modal";
import { TransferUserModal } from "@/components/users/transfer-user-modal";
import { toast } from "sonner";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [dependencyCounts, setDependencyCounts] = useState({ companies: 0, persons: 0, orders: 0 });
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const result = await getUsersAction(page, 20, search, sortField, sortOrder);
    if (result.success) {
      setUsers(result.data || []);
      setTotalPages(result.totalPages || 1);
    }
    setLoading(false);
  }, [page, search, sortField, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleDelete = async (user: any) => {
    // Check dependencies first
    const checkResult = await checkUserDependenciesAction(user.id);
    
    if (checkResult.success && checkResult.hasDependencies) {
      setUserToDelete(user);
      setDependencyCounts(checkResult.counts);
      setIsTransferModalOpen(true);
      return;
    }

    if (!confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
    
    const result = await deleteUserAction(user.id);
    if (result.success) {
      toast.success("Kullanıcı silindi");
      fetchUsers();
    } else {
      toast.error(result.error || "Silme işlemi başarısız");
    }
  };

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortOrder === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Müşteri Temsilcileri</h1>
          <p className="text-gray-500">Kullanıcı ve temsilci yönetimi</p>
        </div>
        <Button onClick={handleCreate}>
          <UserPlus className="w-4 h-4 mr-2" />
          Yeni Kullanıcı
        </Button>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="İsim veya e-posta ara..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => handleSort("first_name")} className="cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center">
                    Ad Soyad <SortIcon field="first_name" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("email")} className="cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center">
                    E-posta <SortIcon field="email" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("phone")} className="cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center">
                    Telefon <SortIcon field="phone" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("role")} className="cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center">
                    Rol <SortIcon field="role" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("created_at")} className="cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center">
                    Kayıt Tarihi <SortIcon field="created_at" />
                  </div>
                </TableHead>
                <TableHead className="w-[100px]">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Kullanıcı bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          <User className="w-4 h-4" />
                        </div>
                        {user.first_name} {user.last_name}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || "-"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user.role === 'admin' ? 'Yönetici' : 'Temsilci'}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString('tr-TR')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(user)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
        onSuccess={fetchUsers}
      />

      <TransferUserModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        user={userToDelete}
        counts={dependencyCounts}
        onSuccess={fetchUsers}
      />
    </div>
  );
}
