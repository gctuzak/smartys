"use client";

import { useState, useEffect, useCallback } from "react";
import { getProductsAction, deleteProductAction, Product } from "@/app/actions/products";
import { ProductForm } from "@/components/products/product-form";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, Loader2, Package, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getProductsAction(page, 20, search, sortField, sortOrder);
      if (result.success) {
        setProducts(result.data || []);
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
    // Debounce search
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
    
    const result = await deleteProductAction(id);
    if (result.success) {
      toast.success("Ürün silindi");
      fetchProducts();
    } else {
      toast.error("Silme işlemi başarısız");
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingProduct(undefined);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    fetchProducts();
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
          <h1 className="text-2xl font-bold text-gray-900">Ürün Yönetimi</h1>
          <p className="text-gray-500">Ürün ve Hizmet Veritabanı</p>
        </div>
        <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Yeni Ürün
        </Button>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-4 border-b flex gap-4">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Ürün adı veya kodu ile ara..."
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
                  <TableHead onClick={() => handleSort("code")} className="cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center">
                      Kod <SortIcon field="code" />
                    </div>
                  </TableHead>
                  <TableHead onClick={() => handleSort("name")} className="cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center">
                      Ürün Adı <SortIcon field="name" />
                    </div>
                  </TableHead>
                  <TableHead onClick={() => handleSort("unit")} className="cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center">
                      Birim <SortIcon field="unit" />
                    </div>
                  </TableHead>
                  <TableHead onClick={() => handleSort("cost")} className="cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center">
                      Maliyet <SortIcon field="cost" />
                    </div>
                  </TableHead>
                  <TableHead onClick={() => handleSort("defaultPrice")} className="cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center">
                      Fiyat <SortIcon field="defaultPrice" />
                    </div>
                  </TableHead>
                  <TableHead onClick={() => handleSort("vatRate")} className="cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center">
                      KDV <SortIcon field="vatRate" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Ürün bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow 
                      key={product.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleEdit(product)}
                    >
                      <TableCell className="font-mono text-xs">{product.code || "-"}</TableCell>
                      <TableCell className="font-medium">
                        <div>{product.name}</div>
                        {product.description && (
                            <div className="text-xs text-gray-500 truncate max-w-[300px]">{product.description}</div>
                        )}
                      </TableCell>
                      <TableCell>{product.unit || "-"}</TableCell>
                      <TableCell>
                        {product.cost ? (
                            <span>{Number(product.cost).toFixed(2)} {product.currency}</span>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="font-semibold text-green-600">
                         {product.defaultPrice ? (
                            <span>{Number(product.defaultPrice).toFixed(2)} {product.currency}</span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>%{product.vatRate}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(product)}
                            className="h-8 w-8 text-gray-500 hover:text-blue-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(product.id!)}
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}
      >
        <ProductForm
          initialData={editingProduct}
          onSuccess={handleSuccess}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
