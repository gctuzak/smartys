import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface RecentProposalsProps {
  proposals: any[];
}

export function RecentProposals({ proposals }: RecentProposalsProps) {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Son Teklifler</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Müşteri</TableHead>
              <TableHead>Tutar</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">Tarih</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proposals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Henüz teklif yok.
                </TableCell>
              </TableRow>
            ) : (
              proposals.map((proposal) => (
                <TableRow key={proposal.id}>
                  <TableCell className="font-medium">
                    {proposal.companies?.name || "Bilinmiyor"}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(proposal.total_amount, proposal.currency)}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold
                      ${proposal.status === 'approved' ? 'bg-green-100 text-green-800' : 
                        proposal.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'}`}>
                      {proposal.status === 'pending' ? 'Beklemede' : 
                       proposal.status === 'approved' ? 'Onaylandı' : 
                       proposal.status === 'rejected' ? 'Reddedildi' : proposal.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {format(new Date(proposal.created_at), "d MMM", { locale: tr })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
