import { useTranslation } from '@shared/i18n/useTranslation';
import { Statistics } from '@shared/types/database';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
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

interface OperatorsChartProps {
  statistics: Statistics[];
}

export default function OperatorsChart({ statistics }: OperatorsChartProps) {
  const { t } = useTranslation();

  // Агрегируем данные по операторам
  const chartData = aggregateByOperator(statistics);

  const chartConfig = {
    tokens: {
      label: `${t('totalTokens')}: `,
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('byOperators')}</CardTitle>
        <CardDescription>
          {t('totalTokens')} {t('byOperators').toLowerCase()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig}>
            <BarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              margin={{
                left: 0,
              }}
            >
              <XAxis type="number" dataKey="tokens" hide />
              <YAxis
                dataKey="operator"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                width={100}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="tokens" fill="var(--color-tokens)" radius={5} />
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

function aggregateByOperator(statistics: Statistics[]): Array<{ operator: string; tokens: number }> {
  if (!Array.isArray(statistics)) {
    return [];
  }
  
  const operatorMap = new Map<string, number>();

  statistics.forEach(stat => {
    const existing = operatorMap.get(stat.operator) || 0;
    operatorMap.set(stat.operator, existing + stat.totalTokens);
  });

  // Сортируем по количеству токенов (убывание)
  const sorted = Array.from(operatorMap.entries())
    .map(([operator, tokens]) => ({ operator, tokens }))
    .sort((a, b) => b.tokens - a.tokens);

  return sorted;
}

