"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Download, FileText, ArrowUpRight, ArrowDownLeft, Building2, Phone, Mail, MapPin, Trash2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getCompanyAction } from "@/app/actions/fetch-data";
import { getCompanyTransactionsAction, deleteTransactionAction } from "@/app/actions/current-account";
import { runMigration022Action } from "@/app/actions/migration";
import { TransactionModal } from "@/components/accounting/transaction-modal";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";

export default function CompanyAccountPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [company, setCompany] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [migrationErrorSql, setMigrationErrorSql] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [companyRes, transactionsRes] = await Promise.all([
        getCompanyAction(companyId),
        getCompanyTransactionsAction(companyId)
      ]);

      if (companyRes.success) {
        setCompany(companyRes.data);
      }
      
      if (transactionsRes.success) {
        setTransactions(transactionsRes.data || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu işlemi silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve bakiyeler yeniden hesaplanacaktır.")) {
      return;
    }

    try {
      const result = await deleteTransactionAction(id, companyId);
      if (result.success) {
        // Refresh data
        fetchData();
      } else {
        alert("Silme işlemi başarısız: " + result.error);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Bir hata oluştu.");
    }
  };

  const handleMigration = async () => {
    if (!confirm("Sistem güncellemesini çalıştırmak istiyor musunuz?")) return;
    
    const res = await runMigration022Action();
    
    if (res.success) {
      alert("Güncelleme başarılı! Şimdi bu butonu kaldırabilirsiniz.");
    } else {
      if (res.sql) {
        setMigrationErrorSql(res.sql);
      } else {
        alert("Hata: " + res.error);
      }
    }
  };

  const copyToClipboard = () => {
    if (migrationErrorSql) {
      navigator.clipboard.writeText(migrationErrorSql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="p-8 text-center">Yükleniyor...</div>;
  }

  if (!company) {
    return <div className="p-8 text-center">Cari bulunamadı.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
          <p className="text-gray-500">Cari Hesap Ekstresi</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="destructive" className="bg-yellow-600 hover:bg-yellow-700 text-white" onClick={handleMigration}>
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Sistem Güncellemesi
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            PDF İndir
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni İşlem
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sol Taraf: Cari Bilgileri */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Cari Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Building2 className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{company.type || "Kurumsal"}</span>
            </div>
            {company.phone1 && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-gray-500" />
                <span>{company.phone1}</span>
              </div>
            )}
            {company.email1 && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>{company.email1}</span>
              </div>
            )}
            {(company.city || company.address) && (
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                <span>
                  {company.address}
                  {company.city && <br />}
                  {company.city && `${company.district ? company.district + " / " : ""}${company.city}`}
                </span>
              </div>
            )}
            
            <div className="pt-4 border-t mt-4">
              <div className="text-sm text-gray-500 mb-1">Güncel Bakiye</div>
              <div className={`text-2xl font-bold ${Number(company.guncel_bakiye) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {Number(company.guncel_bakiye || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                <span className="text-xs font-normal text-gray-500 ml-2">
                  {Number(company.guncel_bakiye) >= 0 ? "(Alacaklıyız)" : "(Borçluyuz)"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sağ Taraf: Hareket Tablosu */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Hesap Hareketleri</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>İşlem Türü</TableHead>
                  <TableHead>Belge No</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead className="text-right">Borç</TableHead>
                  <TableHead className="text-right">Alacak</TableHead>
                  <TableHead className="text-right">Bakiye</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      Henüz işlem hareketi yok.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        {format(new Date(t.tarih), "d MMM yyyy", { locale: tr })}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                          ${t.islem_turu === 'FATURA' ? 'bg-blue-100 text-blue-700' :
                            t.islem_turu === 'TAHSILAT' ? 'bg-green-100 text-green-700' :
                            t.islem_turu === 'ODEME' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                          {t.islem_turu === 'TAHSILAT' && <ArrowDownLeft className="w-3 h-3 mr-1" />}
                          {t.islem_turu === 'ODEME' && <ArrowUpRight className="w-3 h-3 mr-1" />}
                          {t.islem_turu === 'FATURA' && <FileText className="w-3 h-3 mr-1" />}
                          {t.islem_turu}
                        </span>
                      </TableCell>
                      <TableCell>{t.belge_no || "-"}</TableCell>
                      <TableCell className="max-w-[200px]" title={t.aciklama}>
                        <div className="flex flex-col gap-1">
                          <span className="truncate">{t.aciklama || "-"}</span>
                          {t.order && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-fit border border-blue-100">
                              Sipariş: {t.order.order_no}
                            </span>
                          )}
                          {t.fatura && (
                            <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded w-fit border border-purple-100">
                              Fatura: {t.fatura.fatura_no}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {Number(t.borc) > 0 ? (
                          <div className="flex flex-col items-end">
                            <span>{Number(t.borc).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</span>
                            {t.doviz_tutari && (
                              <>
                                <span className="text-xs font-medium text-blue-600">
                                  {formatCurrency(t.doviz_tutari, t.doviz_turu)}
                                </span>
                                {t.doviz_kuru && (
                                  <span className="text-[10px] text-gray-400">
                                    Kur: {Number(t.doviz_kuru).toFixed(4)}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {Number(t.alacak) > 0 ? (
                          <div className="flex flex-col items-end">
                            <span>{Number(t.alacak).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</span>
                            {t.doviz_tutari && (
                              <>
                                <span className="text-xs font-medium text-blue-600">
                                  {formatCurrency(t.doviz_tutari, t.doviz_turu)}
                                </span>
                                {t.doviz_kuru && (
                                  <span className="text-[10px] text-gray-400">
                                    Kur: {Number(t.doviz_kuru).toFixed(4)}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {Number(t.bakiye).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" 
                          onClick={() => handleDelete(t.id)}
                          title="İşlemi Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        companyId={companyId}
        onSuccess={fetchData}
      />

      <Dialog open={!!migrationErrorSql} onOpenChange={(open) => !open && setMigrationErrorSql(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Otomatik Güncelleme Başarısız</DialogTitle>
            <DialogDescription>
              Veritabanı bağlantı hatası nedeniyle güncelleme otomatik yapılamadı. 
              Lütfen aşağıdaki SQL kodunu kopyalayıp Supabase SQL Editöründe çalıştırın.
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative mt-4">
            <Textarea 
              value={migrationErrorSql || ""} 
              readOnly 
              className="font-mono text-xs h-[300px] bg-slate-50 resize-none p-4"
            />
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2 h-8"
              onClick={copyToClipboard}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Kopyalandı
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Kopyala
                </>
              )}
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMigrationErrorSql(null)}>
              Kapat
            </Button>
            <Button onClick={() => {
              setMigrationErrorSql(null);
              alert("Kod çalıştırıldıysa 'Sistem Güncellemesi' butonunu artık kullanmanıza gerek yoktur.");
            }}>
              Kodu Çalıştırdım, Devam Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
