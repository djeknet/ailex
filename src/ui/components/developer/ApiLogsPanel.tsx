import { useState, useEffect } from 'react';
import { ApiLogEntry } from '@shared/types/database';
import { useTranslation } from '@shared/i18n/useTranslation';
import { Button } from '@/ui/components/ui/button';
import { ChevronDown, ChevronUp, Trash2, RefreshCw, Copy, Check } from 'lucide-react';
import { ScrollArea } from '@/ui/components/ui/scroll-area';

export default function ApiLogsPanel() {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Загружаем логи при монтировании компонента
  useEffect(() => {
    loadLogs();
  }, []);

  // Перезагружаем логи при раскрытии панели
  useEffect(() => {
    if (isExpanded) {
      loadLogs();
    }
  }, [isExpanded]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_API_LOGS',
        data: { limit: 100 }
      });
      
      if (Array.isArray(response)) {
        setLogs(response);
      }
    } catch (error) {
      console.error('[ApiLogsPanel] Failed to load logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      await chrome.runtime.sendMessage({
        type: 'CLEAR_API_LOGS'
      });
      setLogs([]);
      setExpandedLogIds(new Set());
    } catch (error) {
      console.error('[ApiLogsPanel] Failed to clear logs:', error);
    }
  };

  const toggleLogExpanded = (id: string) => {
    setExpandedLogIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  };

  const formatJSON = (str?: string) => {
    if (!str) return '-';
    try {
      const parsed = JSON.parse(str);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return str;
    }
  };

  const getStatusColor = (status?: number, error?: string) => {
    if (error) return 'text-red-500';
    if (!status) return 'text-muted-foreground';
    if (status >= 200 && status < 300) return 'text-green-500';
    if (status >= 400) return 'text-red-500';
    return 'text-yellow-500';
  };

  const getTypeColor = (type: 'request' | 'response') => {
    return type === 'request' ? 'text-blue-500' : 'text-purple-500';
  };

  const handleCopy = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('[ApiLogsPanel] Failed to copy:', error);
    }
  };

  const CopyButton = ({ text, fieldId }: { text: string; fieldId: string }) => {
    const isCopied = copiedField === fieldId;
    
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          handleCopy(text, fieldId);
        }}
      >
        {isCopied ? (
          <Check className="h-2.5 w-2.5 text-green-500" />
        ) : (
          <Copy className="h-2.5 w-2.5" />
        )}
      </Button>
    );
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50"
      style={{ height: isExpanded ? '400px' : '40px' }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          <span className="font-medium text-sm">{t('apiLogs')} ({logs.length})</span>
        </div>
        
        {isExpanded && (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={loadLogs}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleClearLogs}
              disabled={logs.length === 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <ScrollArea className="h-[calc(100%-40px)]">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              {t('noLogs')}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {logs.map((log) => {
                const isExpanded = expandedLogIds.has(log.id);
                
                return (
                  <div 
                    key={log.id} 
                    className="border rounded-md bg-card"
                  >
                    {/* Collapsed view */}
                    <div 
                      className="p-2 cursor-pointer hover:bg-accent/50 transition-colors flex items-center gap-2 text-xs"
                      onClick={() => toggleLogExpanded(log.id)}
                    >
                      <span className="text-muted-foreground font-mono">{formatTime(log.timestamp)}</span>
                      <span className={`font-medium uppercase ${getTypeColor(log.type)}`}>
                        {log.type === 'request' ? 'REQ' : 'RES'}
                      </span>
                      <span className="font-mono text-muted-foreground">{log.method}</span>
                      <span className="flex-1 truncate font-mono">{log.url}</span>
                      {log.status && (
                        <span className={`font-mono ${getStatusColor(log.status, log.error)}`}>
                          {log.status}
                        </span>
                      )}
                      {log.error && (
                        <span className="text-red-500 font-medium">ERROR</span>
                      )}
                      {log.duration && (
                        <span className="text-muted-foreground">{log.duration}ms</span>
                      )}
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </div>

                    {/* Expanded view */}
                    {isExpanded && (
                      <div className="border-t p-3 space-y-3 bg-muted/20 overflow-x-auto">
                        {/* URL */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-medium text-muted-foreground">URL</div>
                            <CopyButton text={log.url} fieldId={`${log.id}-url`} />
                          </div>
                          <div className="text-xs font-mono break-all bg-background p-2 rounded">
                            {log.url}
                          </div>
                        </div>

                        {/* Headers */}
                        {log.headers && Object.keys(log.headers).length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs font-medium text-muted-foreground">
                                {t('headers')}
                              </div>
                              <CopyButton 
                                text={JSON.stringify(log.headers, null, 2)} 
                                fieldId={`${log.id}-headers`} 
                              />
                            </div>
                            <div className="max-h-40 overflow-y-auto border border-border rounded">
                              <div className="text-xs font-mono bg-background p-2 space-y-1">
                                {Object.entries(log.headers).map(([key, value]) => (
                                  <div key={key} className="break-all">
                                    <span className="text-muted-foreground">{key}:</span> {value}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Request Body */}
                        {log.requestBody && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs font-medium text-muted-foreground">
                                {t('requestBody')}
                              </div>
                              <CopyButton 
                                text={formatJSON(log.requestBody)} 
                                fieldId={`${log.id}-reqbody`} 
                              />
                            </div>
                            <div className="max-h-60 overflow-auto border border-border rounded">
                              <pre className="text-xs font-mono bg-background p-2 whitespace-pre-wrap" style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                                {formatJSON(log.requestBody)}
                              </pre>
                            </div>
                          </div>
                        )}

                        {/* Response Body */}
                        {log.responseBody && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs font-medium text-muted-foreground">
                                {t('responseBody')}
                              </div>
                              <CopyButton 
                                text={formatJSON(log.responseBody)} 
                                fieldId={`${log.id}-resbody`} 
                              />
                            </div>
                            <div className="max-h-60 overflow-auto border border-border rounded">
                              <pre className="text-xs font-mono bg-background p-2 whitespace-pre-wrap" style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                                {formatJSON(log.responseBody)}
                              </pre>
                            </div>
                          </div>
                        )}

                        {/* Error */}
                        {log.error && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs font-medium text-red-500">
                                {t('error')}
                              </div>
                              <CopyButton text={log.error} fieldId={`${log.id}-error`} />
                            </div>
                            <div className="text-xs font-mono bg-background p-2 rounded text-red-500 break-all">
                              {log.error}
                            </div>
                          </div>
                        )}

                        {/* Meta info */}
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          {log.duration && <span>{t('duration')}: {log.duration}ms</span>}
                          {log.status && (
                            <span className={getStatusColor(log.status, log.error)}>
                              {t('status')}: {log.status}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
}

