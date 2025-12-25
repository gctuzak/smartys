import { getExchangeRatesHistory } from "@/app/actions/exchange-rates";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default async function ExchangeRatesPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const { data: rates, count } = await getExchangeRatesHistory(page);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Döviz Kurları Arşivi</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Günlük TCMB Kurları</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead className="text-right">USD Alış</TableHead>
                <TableHead className="text-right">USD Satış</TableHead>
                <TableHead className="text-right">EUR Alış</TableHead>
                <TableHead className="text-right">EUR Satış</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates && rates.length > 0 ? (
                rates.map((rate: any) => (
                  <TableRow key={rate.date}>
                    <TableCell className="font-medium">
                      {format(new Date(rate.date), "d MMMM yyyy, EEEE", { locale: tr })}
                    </TableCell>
                    <TableCell className="text-right">{Number(rate.usd_buying).toFixed(4)}</TableCell>
                    <TableCell className="text-right">{Number(rate.usd_selling).toFixed(4)}</TableCell>
                    <TableCell className="text-right">{Number(rate.eur_buying).toFixed(4)}</TableCell>
                    <TableCell className="text-right">{Number(rate.eur_selling).toFixed(4)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Henüz kayıtlı kur bilgisi bulunmamaktadır.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
