import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";
import { useTheme } from "@/hooks/use-theme";

type ChartView = "week" | "month" | "year";

type ChartDataPoint = {
  label: string;
  expenses: number;
  profit: number;
  listingName: string;
  inventoryName: string;
  listingId: number;
  totalProfit: number;
};

type ExpenseChartProps = {
  weekData: ChartDataPoint[];
  monthData: ChartDataPoint[];
  yearData: ChartDataPoint[];
  defaultView?: ChartView;
};

// const baseColors = [
//   "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899",
//   "#22D3EE", "#000000", "#84CC16", "#0EA5E9", "#6366F1", "#D946EF",
//   "#FB923C", "#14B8A6", "#F87171", "#A855F7", "#F43F5E", "#06B6D4",
//   "#4ADE80", "#FACC15", "#7C3AED", "#FCD34D", "#DC2626", "#0F766E"
// ];

// const getColorByIndex = (index: number) => baseColors[index % baseColors.length];

export default function ProfitInventoryChart({
  weekData,
  monthData,
  yearData,
  defaultView = "month"
}: ExpenseChartProps) {
  const { theme } = useTheme();
  const [activeView, setActiveView] = useState<ChartView>(defaultView);

  const chartData = useMemo(() => {
    const data =
      activeView === "week"
        ? weekData
        : activeView === "month"
        ? monthData
        : yearData;

    return data
      .filter(item => item.inventoryName !== "Unknown")
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .map(item => ({
        name: item.inventoryName,
        value: item.totalProfit
      }));
  }, [activeView, weekData, monthData, yearData]);

  const chartColors = useMemo(() => {
    return {
      bar: "#3B82F6", // blue
      tooltipBg: theme === 'dark' ? '#374151' : '#ffffff',
      text: theme === 'dark' ? '#e5e7eb' : '#1f2937',
      grid: theme === 'dark' ? '#4B5563' : '#E5E7EB',
    };
  }, [theme]);

  return (
    <Card className="shadow">
      <CardHeader className="px-5 py-4 border-b border-border flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium leading-6 text-foreground">
          Profit by Inventory
        </CardTitle>
        <div className="flex space-x-1">
          {(["week", "month", "year"] as ChartView[]).map((view) => (
            <Button
              key={view}
              variant={activeView === view ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveView(view)}
              className="px-2 py-1 text-xs capitalize"
            >
              {view}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="h-[350px] overflow-y-auto">
          <div className="min-w-[100%] h-fit">
            <ResponsiveContainer width="100%" minHeight={chartData.length * 50}>
            {chartData.length !== 0 ? (
              <BarChart
                layout="vertical"
                data={chartData}
                // margin={{ top: 20, right: 40, bottom: 20 }}
                barCategoryGap={15}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis
                  type="number"
                  stroke={chartColors.text}
                  fontSize={12}
                  tickFormatter={(value: number) => `$${value}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke={chartColors.text}
                  fontSize={12}
                  width={140}
                />
                <Tooltip
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                  contentStyle={{
                    backgroundColor: chartColors.tooltipBg,
                    borderColor: "transparent",
                    color: chartColors.text,
                  }}
                  labelStyle={{ color: chartColors.text }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar
                  dataKey="value"
                  name="Total Profit"
                  fill={chartColors.bar}
                  barSize={24}
                  radius={[0, 6, 6, 0]}
                >
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                    fill={chartColors.text}
                    fontSize={12}
                  />
                </Bar>
              </BarChart>
            ) : (
              <p className="flex justify-center items-center h-full text-xl text-muted-foreground">
                Data Not Found
              </p>
            )}
          </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
