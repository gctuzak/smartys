"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SalesData } from "@/app/actions/dashboard-charts";

interface SalesTrendChartProps {
  data: SalesData[];
}

export function SalesTrendChart({ data }: SalesTrendChartProps) {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Aylık Satış Performansı</CardTitle>
        <CardDescription>
          Bu yılın aylık toplam sipariş tutarları
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <XAxis
              dataKey="name"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}₺`}
            />
             <Tooltip 
                formatter={(value: number) => [`${value.toLocaleString('tr-TR')} ₺`, 'Tutar']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
             />
            <Bar
              dataKey="total"
              fill="#2563eb" // blue-600
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
