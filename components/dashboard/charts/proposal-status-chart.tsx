"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusData } from "@/app/actions/dashboard-charts";

interface ProposalStatusChartProps {
  data: StatusData[];
}

export function ProposalStatusChart({ data }: ProposalStatusChartProps) {
  // If no data, show a placeholder or empty state handled by parent or empty chart
  const hasData = data.length > 0;

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Teklif Durumları</CardTitle>
        <CardDescription>
          Tekliflerinizin güncel durum dağılımı
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {hasData ? (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                // label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || '#8884d8'} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [value, 'Adet']} />
              <Legend />
            </PieChart>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Veri bulunamadı
            </div>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
