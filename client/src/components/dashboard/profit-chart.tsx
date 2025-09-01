import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

type ChartView = "week" | "month" | "year";

type ChartDataPoint = {
  label: string;      // e.g., "Mon", "Week 23", or "September"
  expenses: number;
  profit: number;
};

type ProfitChartData = {
  weekData: ChartDataPoint[];
  monthData: ChartDataPoint[];
  yearData: ChartDataPoint[];
  defaultView?: ChartView;
};

export default function ProfitChart({
  weekData,
  monthData,
  yearData,
  defaultView = "month",
}: ProfitChartData) {
  const { theme } = useTheme();
  const [activeView, setActiveView] = useState<ChartView>(defaultView);

  const chartData = useMemo(() => {
    return activeView === "week"
      ? weekData
      : activeView === "month"
      ? monthData
      : yearData;
  }, [activeView, weekData, monthData, yearData]);

  const colors = useMemo(() => {
    return {
      profit: theme === "dark" ? "#34d399" : "#10B981",     // green
      grid: theme === "dark" ? "#4B5563" : "#E5E7EB",       // gray
      text: theme === "dark" ? "#D1D5DB" : "#374151",       // gray
      tooltipBg: theme === "dark" ? "#1F2937" : "#ffffff",  // bg
    };
  }, [theme]);

  const isMonthView = activeView === "month";

  return (
    <Card className="shadow">
      <CardHeader className="px-5 py-4 border-b border-border flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium text-foreground">
          Profit Over Time
        </CardTitle>
        <div className="flex space-x-1">
          {["week", "month", "year"].map((view) => (
            <Button
              key={view}
              variant={activeView === view ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveView(view as ChartView)}
              className="px-2 py-1 text-xs capitalize"
            >
              {view}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 10, bottom: isMonthView ? 40 : 5 }}
            >
              <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                stroke={colors.text}
                fontSize={12}
                interval={isMonthView ? 0 : "preserveEnd"} // Show all labels only for month
                angle={isMonthView ? -30 : 0}
                textAnchor={isMonthView ? "end" : "middle"}
                dy={isMonthView ? 10 : 0}
              />
              <YAxis stroke={colors.text} fontSize={12} />
              <Tooltip
                formatter={(value: number) => `$${value.toFixed(2)}`}
                contentStyle={{
                  backgroundColor: colors.tooltipBg,
                  borderColor: "transparent",
                  color: colors.text,
                }}
                labelStyle={{ color: colors.text }}
              />
              <Legend verticalAlign="top" height={36} />
              <Line
                type="monotone"
                dataKey="profit"
                name="Profit Over Time"
                stroke={colors.profit}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              >
                <LabelList
                  dataKey="profit"
                  position="top"
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                  fill={colors.text}
                  fontSize={12}
                />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
