import InvoiceBuilder from "@/components/accounting/invoice-builder";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="container mx-auto py-6">
      <InvoiceBuilder initialInvoiceId={id} />
    </div>
  );
}
