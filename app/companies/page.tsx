'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Building2, Trash2, Edit, Plus, ArrowUpDown, ArrowUp, ArrowDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCompaniesAction, deleteCompanyAction } from "@/app/actions/fetch-data";
import { CompanyModal } from "@/components/companies/company-modal";
import { toast } from "sonner";

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getCompaniesAction(page, 20, search, sortField, sortOrder);
      if (result.success) {
        setCompanies(result.data || []);
        setTotalPages(result.totalPages || 1);
      } else {
        toast.error(result.error || "Veriler alınamadı");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Beklenmeyen bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [page, search, sortField, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCompanies();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCompanies]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu şirketi silmek istediğinize emin misiniz? İlişkili kişiler ve teklifler etkilenebilir.")) return;
    
    const result = await deleteCompanyAction(id);
    if (result.success) {
      toast.success("Şirket silindi");
      fetchCompanies();
    } else {
      toast.error(result.error || "Silme işlemi başarısız");
    }
  };

  const handleEdit = (company: any) => {
    setSelectedCompany(company);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedCompany(null);
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
          <h1 className="text-2xl font-bold text-gray-900">Şirketler</h1>
          <p className="text-gray-500">Kayıtlı şirket veritabanı</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Şirket
        </Button>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Şirket adı ile ara..."
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
                <TableHead onClick={() => handleSort("code")} className="cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center">
                    Kod <SortIcon field="code" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("name")} className="cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center">
                    Şirket Adı <SortIcon field="name" />
                  </div>
                </TableHead>
                <TableHead>Vergi No / Daire</TableHead>
                <TableHead onClick={() => handleSort("type")} className="cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center">
                    Tür <SortIcon field="type" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("city")} className="cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center">
                    İl/İlçe <SortIcon field="city" />
                  </div>
                </TableHead>
                <TableHead>Temsilci</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    Şirket bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((company) => (
                  <TableRow 
                    key={company.id} 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleEdit(company)}
                  >
                    <TableCell className="font-mono text-sm">{company.code?.replace(/^O/, '') || "-"}</TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      {company.name}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{company.tax_no || "-"}</div>
                      <div className="text-xs text-gray-500">{company.tax_office}</div>
                    </TableCell>
                    <TableCell>{company.type || "-"}</TableCell>
                    <TableCell>
                      {company.city ? `${company.city}${company.district ? ` / ${company.district}` : ""}` : "-"}
                    </TableCell>
                    <TableCell>
                      {company.representative 
                        ? `${company.representative.first_name} ${company.representative.last_name}` 
                        : "-"}
                    </TableCell>
                    <TableCell>{company.phone1 || "-"}</TableCell>
                    <TableCell>{company.email1 || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/muhasebe/cariler/${company.id}`)}
                          className="h-8 w-8 text-gray-500 hover:text-blue-600"
                          title="Cari Ekstre"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(company)}
                          className="h-8 w-8 text-gray-500 hover:text-blue-600"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(company.id)}
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

      <CompanyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        company={selectedCompany}
        onSuccess={fetchCompanies}
      />
    </div>
  );
}
