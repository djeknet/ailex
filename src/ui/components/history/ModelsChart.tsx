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

interface ModelsChartProps {
  statistics: Statistics[];
}

export default function ModelsChart({ statistics }: ModelsChartProps) {
  const { t } = useTranslation();

  // Агрегируем данные по моделям (топ-10)
  const chartData = aggregateByModel(statistics);

  const chartConfig = {
    tokens: {
      label: `${t('totalTokens')}: `,
      color: 'hsl(var(--chart-2))',
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('byModels')}</CardTitle>
        <CardDescription>
          {t('totalTokens')} {t('byModels').toLowerCase()}
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
                dataKey="model"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                width={150}
                tickFormatter={(value) => {
                  // Укорачиваем длинные названия моделей
                  if (value.length > 20) {
                    return value.substring(0, 17) + '...';
                  }
                  return value;
                }}
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

function aggregateByModel(statistics: Statistics[]): Array<{ model: string; tokens: number }> {
  if (!Array.isArray(statistics)) {
    return [];
  }
  
  const modelMap = new Map<string, number>();

  statistics.forEach(stat => {
    const existing = modelMap.get(stat.model) || 0;
    modelMap.set(stat.model, existing + stat.totalTokens);
  });

  // Сортируем по количеству токенов (убывание) и берем топ-10
  const sorted = Array.from(modelMap.entries())
    .map(([model, tokens]) => ({ model, tokens }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 10);

  return sorted;
}

