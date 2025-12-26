"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityData } from "@/app/actions/dashboard-charts";

interface ActivityDistributionChartProps {
  data: ActivityData[];
}

export function ActivityDistributionChart({ data }: ActivityDistributionChartProps) {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Aktivite Dağılımı</CardTitle>
        <CardDescription>
          Türlerine göre aktiviteleriniz
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip
                cursor={{fill: 'transparent'}}
                formatter={(value: number) => [value, 'Adet']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="#f97316" /> // orange-500
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
