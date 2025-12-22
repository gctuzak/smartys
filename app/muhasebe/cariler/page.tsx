"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, FileText, ArrowUpDown, ArrowUp, ArrowDown, Building2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCompaniesAction } from "@/app/actions/fetch-data";

export default function CurrentAccountsPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState("guncel_bakiye"); // Default sort by balance
  const [sortOrder, setSortOrder] = useState("asc"); // Ascending (Debt first? or mixed)

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      // We reuse getCompaniesAction but we might want to filter only those with balance != 0 if needed.
      // For now, list all companies as potential current accounts.
      const result = await getCompaniesAction(page, 20, search, sortField, sortOrder);
      
      if (result.success) {
        setCompanies(result.data || []);
        setTotalPages(result.totalPages || 1);
      }
    } catch (error) {
      console.error("Fetch error:", error);
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
          <h1 className="text-2xl font-bold text-gray-900">Cari Hesaplar</h1>
          <p className="text-gray-500">Müşteri ve Tedarikçi Bakiyeleri</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b flex gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Firma adı, vergi no ile ara..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          )}
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => handleSort("name")} className="cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center">
                    Firma Ünvanı <SortIcon field="name" />
                  </div>
                </TableHead>
                <TableHead>İletişim</TableHead>
                <TableHead>Vergi No / Daire</TableHead>
                <TableHead onClick={() => handleSort("guncel_bakiye")} className="cursor-pointer hover:bg-gray-100 text-right">
                  <div className="flex items-center justify-end">
                    Bakiye <SortIcon field="guncel_bakiye" />
                  </div>
                </TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    Kayıt bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((company) => (
                  <TableRow 
                    key={company.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/muhasebe/cariler/${company.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        {company.name}
                      </div>
                      {company.type && (
                        <div className="text-xs text-gray-500 ml-6">{company.type}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {company.phone1 && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="h-3 w-3" /> {company.phone1}
                        </div>
                      )}
                      {company.email1 && (
                        <div className="text-xs text-gray-500">{company.email1}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{company.tax_no || "-"}</div>
                      <div className="text-xs text-gray-500">{company.tax_office}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={`font-bold ${Number(company.guncel_bakiye) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {Number(company.guncel_bakiye || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                      </div>
                      <div className="text-xs text-gray-500">
                        {Number(company.guncel_bakiye) >= 0 ? "Alacaklıyız" : "Borçluyuz"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/muhasebe/cariler/${company.id}`);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Ekstre
                      </Button>
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
    </div>
  );
}
