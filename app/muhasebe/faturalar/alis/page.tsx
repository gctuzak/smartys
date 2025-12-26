import { getInvoicesAction } from "@/app/actions/accounting";
import InvoiceList from "@/components/accounting/invoice-list";
import PurchaseInvoiceUploader from "@/components/accounting/purchase-invoice-uploader";

export default async function PurchaseInvoicesPage() {
  const { data: invoices, error } = await getInvoicesAction(1, 50, "ALIS");

  if (error) {
    return <div className="p-6 text-red-500">Hata: {error}</div>;
  }

  return (
    <InvoiceList 
      title="Alış Faturaları" 
      invoices={invoices || []} 
      type="ALIS"
    >
      <PurchaseInvoiceUploader />
    </InvoiceList>
  );
}
