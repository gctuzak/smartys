'use client';

import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, User, Trash2, Edit, Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPersonsAction, deletePersonAction } from "@/app/actions/fetch-data";
import { PersonModal } from "@/components/persons/person-modal";
import { toast } from "sonner";

export default function PersonsPage() {
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);

  const fetchPersons = useCallback(async () => {
    setLoading(true);
    // Passing undefined for companyId to fetch all persons
    const result = await getPersonsAction(undefined, page, 20, search);
    if (result.success) {
      setPersons(result.data || []);
      setTotalPages(result.totalPages || 1);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPersons();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchPersons]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu kişiyi silmek istediğinize emin misiniz?")) return;
    
    const result = await deletePersonAction(id);
    if (result.success) {
      toast.success("Kişi silindi");
      fetchPersons();
    } else {
      toast.error(result.error || "Silme işlemi başarısız");
    }
  };

  const handleEdit = (person: any) => {
    setSelectedPerson(person);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedPerson(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kişiler</h1>
          <p className="text-gray-500">Kayıtlı kişi veritabanı</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Kişi
        </Button>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Ad veya soyad ile ara..."
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
                <TableHead>Kod</TableHead>
                <TableHead>Ad Soyad</TableHead>
                <TableHead>Şirket</TableHead>
                <TableHead>Ünvan</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Temsilci</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {persons.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    Kişi bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                persons.map((person) => (
                  <TableRow 
                    key={person.id} 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleEdit(person)}
                  >
                    <TableCell className="font-mono text-sm">{person.code || "-"}</TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      {person.first_name} {person.last_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-gray-400" />
                        {person.company?.name || "-"}
                      </div>
                    </TableCell>
                    <TableCell>{person.title || "-"}</TableCell>
                    <TableCell>{person.phone1 || "-"}</TableCell>
                    <TableCell>{person.email1 || "-"}</TableCell>
                    <TableCell>
                      {person.representative 
                        ? `${person.representative.first_name} ${person.representative.last_name}` 
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(person)}
                          className="h-8 w-8 text-gray-500 hover:text-blue-600"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(person.id)}
                          className="h-8 w-8 text-gray-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Önceki
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600">
            Sayfa {page} / {Math.max(1, totalPages)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Sonraki
          </Button>
        </div>
      </div>

      <PersonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        person={selectedPerson}
        onSuccess={fetchPersons}
      />
    </div>
  );
}
