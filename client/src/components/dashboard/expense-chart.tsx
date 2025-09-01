import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  PieLabelRenderProps,
  Bar,
  XAxis,
  YAxis,
  BarChart,
  LabelList
} from "recharts";
import { useTheme } from "@/hooks/use-theme";

type ChartView = "week" | "month" | "year";

type ChartDataPoint = {
  label: string;
  expenses: number;
  profit: number;
  listingName: string;
  listingId: number;
  totalProfit: number;
};

type ExpenseChartProps = {
  weekData: ChartDataPoint[];
  monthData: ChartDataPoint[];
  yearData: ChartDataPoint[];
  defaultView?: ChartView;
};

// Base color palette
const baseColors = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899",
  "#22D3EE", "#0F766E", "#84CC16", "#0EA5E9", "#6366F1", "#D946EF",
  "#FB923C", "#14B8A6", "#F87171", "#A855F7", "#F43F5E", "#06B6D4",
  "#4ADE80", "#FACC15", "#7C3AED", "#FCD34D", "#DC2626",
];

// Helper to cycle through colors
const getColorByIndex = (index: number) => baseColors[index % baseColors.length];

export default function ExpenseChart({
  weekData,
  monthData,
  yearData,
  defaultView = "month"
}: ExpenseChartProps) {
  const { theme } = useTheme();
  const [activeView, setActiveView] = useState<ChartView>(defaultView);
  const [hoverColor, setHoverColor] = useState("#000");
  const usedYMap = useRef<Set<number>>(new Set());
  // Chart data based on active view
  const chartData = useMemo(() => {
    const data =
      activeView === "week"
        ? weekData
        : activeView === "month"
          ? monthData
          : yearData;

    return data.filter(item => item.listingName !== "Unknown").sort((a, b) => b.totalProfit - a.totalProfit).map((item, index) => ({
      name: item.listingName,
      value: item.totalProfit,
      color: getColorByIndex(index),
    }));
  }, [activeView, weekData, monthData, yearData]);

  const chartColors = useMemo(() => {
    return {
      tooltipBg: theme === 'dark' ? '#374151' : '#ffffff',
      text: theme === 'dark' ? '#e5e7eb' : '#1f2937',
    };
  }, [theme]);

  const renderSmartLabel = (props: PieLabelRenderProps) => {
    const {
      cx = 0,
      cy = 0,
      midAngle = 0,
      outerRadius = 100,
      percent = 0,
      value,
      index
    } = props;

    const RADIAN = Math.PI / 180;
    const startRadius = Number(outerRadius);
    const labelRadius = startRadius + 24;

    const startX = Number(cx) + Number(startRadius) * Math.cos(-midAngle * RADIAN);
    const startY = Number(cy) + Number(startRadius) * Math.sin(-midAngle * RADIAN);
    const endX = Number(cx) + Number(labelRadius) * Math.cos(-midAngle * RADIAN);
    const endY = Number(cy) + Number(labelRadius) * Math.sin(-midAngle * RADIAN);

    // Prevent overlapping Y values
    let roundedY = Math.round(endY / 5) * 5;
    let attempts = 0;
    while (usedYMap.current.has(roundedY) && attempts < 10) {
      roundedY += 14;
      attempts++;
    }
    usedYMap.current.add(roundedY);

    // if (percent < 0.005) return null;

    return (
      <>
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={roundedY}
          stroke={chartData[index ?? 0]?.color ?? "#000"}
          strokeWidth={1}
        />
        <text
          x={endX}
          y={roundedY}
          fill={chartData[index ?? 0]?.color ?? "#000"}
          textAnchor={endX > Number(cx) ? "start" : "end"}
          dominantBaseline="central"
          fontSize={13}
          style={{ pointerEvents: "none" }}
        >
          ${Number(value).toFixed(2)} ({(percent * 100).toFixed(1)}%)
        </text>
      </>
    );
  };


  return (
    <Card className="shadow">
      <CardHeader className="px-5 py-4 border-b border-border flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium leading-6 text-foreground">
          Profit by Listing
        </CardTitle>
        <div className="flex space-x-1">
          {(['week', 'month', 'year'] as ChartView[]).map((view) => (
            <Button
              key={view}
              variant={activeView === view ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                usedYMap.current = new Set(); // reset label positions
                setActiveView(view);
              }}
              className="px-2 py-1 text-xs"
            >
              {view[0].toUpperCase() + view.slice(1)}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="h-[350px] overflow-y-auto pr-2">
          <div className="min-w-[100%] h-fit">
          <ResponsiveContainer width="100%" minHeight={chartData.length * 50}>
            {chartData.length !== 0 ? (
              <BarChart
                data={chartData}
                layout="vertical"
                // margin={{ top: 20, right: 40, bottom: 20 }}
                barCategoryGap={20}
                >
                <XAxis
                  type="number"
                  tick={{ fill: chartColors.text }}
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
                  formatter={(value: number, name: string, props: any) => {
                    const color = props?.payload?.color || "#000";
                    return [
                      <span style={{ color }}>{`$${value}`}</span>,
                      name
                    ];
                  }}
                  contentStyle={{
                    backgroundColor: chartColors.tooltipBg,
                    borderColor: "transparent",
                  }}
                  labelStyle={{ color: chartColors.text }}
                />
                <Bar dataKey="value" barSize={36} radius={[0, 6, 6, 0]}>
                  {chartData.map((entry) => (
                    <>
                      <LabelList
                        dataKey="value"
                        position="right"
                        formatter={(value: number) => `$${value.toFixed(2)}`}
                        fontSize={14}
                      />
                      <Cell
                        fill={entry.color}
                        onMouseEnter={() => setHoverColor(entry.color)}
                      />
                    </>

                  ))}
                </Bar>
              </BarChart>
            ) : (
              <p
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                  fontSize: "25px",
                  color: "#8f8f8f",
                }}
              >
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
