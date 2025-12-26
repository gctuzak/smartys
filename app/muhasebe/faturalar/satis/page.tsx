import { getInvoicesAction } from "@/app/actions/accounting";
import InvoiceList from "@/components/accounting/invoice-list";

export default async function SalesInvoicesPage() {
  const { data: invoices, error } = await getInvoicesAction(1, 50, "SATIS");

  if (error) {
    return <div className="p-6 text-red-500">Hata: {error}</div>;
  }

  return (
    <InvoiceList 
      title="Satış Faturaları" 
      invoices={invoices || []} 
      type="SATIS"
    />
  );
}
