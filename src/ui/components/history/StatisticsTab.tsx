import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@shared/i18n/useTranslation';
import { useSettingsStore } from '@shared/stores/settingsStore';
import { Statistics } from '@shared/types/database';
import { statisticsAPI } from '@shared/utils/messaging';
import { getOperatorIcon } from '@shared/services/aiService';
import { ScrollArea } from '@/ui/components/ui/scroll-area';
import { Button } from '@/ui/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/components/ui/select';
import { Calendar } from '@/ui/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/components/ui/tooltip';
import { CalendarIcon, Info } from 'lucide-react';
import { format } from 'date-fns';
import DailyStatsChart from './DailyStatsChart';
import OperatorsChart from './OperatorsChart';
import ModelsChart from './ModelsChart';
import { cn } from '@/shared/utils/cn';

export default function StatisticsTab() {
  const { t } = useTranslation();
  const { operators } = useSettingsStore();
  
  // Фильтры
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // По умолчанию 7 дней назад
    return date;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedOperator, setSelectedOperator] = useState<string>('all');
  
  // Данные
  const [statistics, setStatistics] = useState<Statistics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Загрузка данных
  useEffect(() => {
    loadStatistics();
  }, [startDate, endDate, selectedOperator]);
  
  const loadStatistics = async () => {
    setIsLoading(true);
    try {
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      const operator = selectedOperator === 'all' ? undefined : selectedOperator;
      
      const data = await statisticsAPI.getStatistics(startDateStr, endDateStr, operator);
      setStatistics(data || []);
    } catch (error) {
      console.error('Error loading statistics:', error);
      setStatistics([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Итоговые показатели
  const totals = useMemo(() => {
    if (!Array.isArray(statistics)) {
      return { totalMessages: 0, totalTokens: 0 };
    }
    const totalMessages = statistics.reduce((sum, stat) => sum + stat.messageCount, 0);
    const totalTokens = statistics.reduce((sum, stat) => sum + stat.totalTokens, 0);
    return { totalMessages, totalTokens };
  }, [statistics]);
  
  // Быстрые периоды
  const setCurrentWeek = () => {
    const end = new Date();
    const start = new Date();
    const dayOfWeek = start.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Понедельник
    start.setDate(start.getDate() - diff);
    setStartDate(start);
    setEndDate(end);
  };
  
  const setCurrentMonth = () => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    setStartDate(start);
    setEndDate(end);
  };
  
  const setPreviousWeek = () => {
    const end = new Date();
    const start = new Date();
    const dayOfWeek = start.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    start.setDate(start.getDate() - diff - 7);
    end.setDate(end.getDate() - diff - 1);
    setStartDate(start);
    setEndDate(end);
  };
  
  const setPreviousMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    setStartDate(start);
    setEndDate(end);
  };
  
  // Список подключенных операторов
  const connectedOperators = operators.filter(op => op.apiKey && op.apiKey.length > 0);
  
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Фильтры */}
        <div className="space-y-3">
          {/* Быстрые периоды */}
          <div className="grid grid-cols-4 gap-2">
            <Button variant="outline" size="sm" onClick={setCurrentWeek} className="w-full overflow-hidden text-ellipsis whitespace-nowrap">
              {t('currentWeek')}
            </Button>
            <Button variant="outline" size="sm" onClick={setCurrentMonth} className="w-full overflow-hidden text-ellipsis whitespace-nowrap">
              {t('currentMonth')}
            </Button>
            <Button variant="outline" size="sm" onClick={setPreviousWeek} className="w-full overflow-hidden text-ellipsis whitespace-nowrap">
              {t('previousWeek')}
            </Button>
            <Button variant="outline" size="sm" onClick={setPreviousMonth} className="w-full overflow-hidden text-ellipsis whitespace-nowrap">
              {t('previousMonth')}
            </Button>
          </div>
          
          {/* Даты и оператор */}
          <div className="grid grid-cols-3 gap-2">
            {/* Дата от */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'dd.MM.yyyy') : t('dateFrom')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        if (date) {
                          // Если выбранная дата больше endDate, обновляем endDate
                          if (endDate && date > endDate) {
                            setEndDate(date);
                          }
                          setStartDate(date);
                        }
                      }}
                      disabled={(date) => endDate ? date > endDate : false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('dateFrom')}</p>
              </TooltipContent>
            </Tooltip>
            
            {/* Дата до */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'dd.MM.yyyy') : t('dateTo')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        if (date) {
                          // Если выбранная дата меньше startDate, обновляем startDate
                          if (startDate && date < startDate) {
                            setStartDate(date);
                          }
                          setEndDate(date);
                        }
                      }}
                      disabled={(date) => startDate ? date < startDate : false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('dateTo')}</p>
              </TooltipContent>
            </Tooltip>
            
            {/* Оператор */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('allOperators')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allOperators')}</SelectItem>
                    {connectedOperators.map(op => {
                      const iconSrc = getOperatorIcon(op.operator as any);
                      return (
                        <SelectItem key={op.operator} value={op.operator}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img src={iconSrc} alt={op.operator} width="16" height="16" />
                            <span>{op.operator}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('operator')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {/* Итоговые показатели */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">{t('totalMessages')}</div>
            <div className="text-3xl font-bold">{totals.totalMessages.toLocaleString()}</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">{t('totalTokens')}</div>
            <div className="text-3xl font-bold">{totals.totalTokens.toLocaleString()}</div>
          </div>
        </div>
        
        {/* Графики */}
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">
            {t('loading')}...
          </div>
        ) : (
          <div className="space-y-6">
            {/* График по дням */}
            <DailyStatsChart statistics={statistics} />
            
            {/* Графики по операторам и моделям */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <OperatorsChart statistics={statistics} />
              <ModelsChart statistics={statistics} />
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

