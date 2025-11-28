import { useTranslation } from '@shared/i18n/useTranslation';
import { Statistics } from '@shared/types/database';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/ui/components/ui/chart';

interface DailyStatsChartProps {
  statistics: Statistics[];
}

export default function DailyStatsChart({ statistics }: DailyStatsChartProps) {
  const { t } = useTranslation();

  // Агрегируем данные по дням
  const chartData = aggregateByDay(statistics);

  const chartConfig = {
    tokens: {
      label: `${t('tokensPerDay')}: `,
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('tokensPerDay')}</CardTitle>
        {chartData.length > 0 && (
          <CardDescription>
            {chartData[0].date} - {chartData[chartData.length - 1].date}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig}>
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => {
                  // Парсим дату напрямую из строки yyyy-MM-dd, чтобы избежать проблем с часовыми поясами
                  const [year, month, day] = value.split('-');
                  return `${parseInt(month)}/${parseInt(day)}`;
                }}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" />}
              />
              <Bar dataKey="tokens" fill="var(--color-tokens)" radius={4} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            {t('noData')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function aggregateByDay(statistics: Statistics[]): Array<{ date: string; messages: number; tokens: number }> {
  if (!Array.isArray(statistics)) {
    return [];
  }
  
  const dayMap = new Map<string, { messages: number; tokens: number }>();

  statistics.forEach(stat => {
    const existing = dayMap.get(stat.date) || { messages: 0, tokens: 0 };
    dayMap.set(stat.date, {
      messages: existing.messages + stat.messageCount,
      tokens: existing.tokens + stat.totalTokens,
    });
  });

  // Сортируем по дате
  const sorted = Array.from(dayMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return sorted;
}

