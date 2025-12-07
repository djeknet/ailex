import { useState, useEffect } from 'react';
import { useSettingsStore } from '@shared/stores/settingsStore';
import { useTranslation } from '@shared/i18n/useTranslation';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import { AIOperator, AIOperatorConfig } from '@shared/types/ai';
import { testConnection, listModels, getOperatorName } from '@shared/services/aiService';
import { storageAPI } from '@shared/utils/messaging';
import { ModelCombobox } from './ModelCombobox';
import { AI_OPERATOR_LINKS, EXTERNAL_URLS } from '@shared/constants';
import { RefreshCw, Trash2, Hand, PartyPopper } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/ui/components/ui/alert-dialog';

const operators: AIOperator[] = ['openai', 'anthropic', 'openrouter', 'grok', 'gemini', 'lmstudio', 'deepseek'];

const WELCOME_BANNER_DISMISSED_KEY = 'ailex-welcome-banner-dismissed';

export default function OperatorsTab() {
  const { t } = useTranslation();
  const { operators: savedOperators, updateOperators } = useSettingsStore();
  const [configs, setConfigs] = useState<Record<AIOperator, AIOperatorConfig>>(
    operators.reduce((acc, op) => {
      const saved = savedOperators.find(o => o.operator === op);
      acc[op] = saved || {
        operator: op,
        apiKey: '',
        endpoint: '',
        selectedModel: '',
        models: []
      };
      return acc;
    }, {} as Record<AIOperator, AIOperatorConfig>)
  );
  const [testing, setTesting] = useState<Partial<Record<AIOperator, boolean>>>({});
  const [testResults, setTestResults] = useState<Partial<Record<AIOperator, boolean | null>>>({});
  const [showEndpoint, setShowEndpoint] = useState<Partial<Record<AIOperator, boolean>>>({});
  const [operatorToRemove, setOperatorToRemove] = useState<AIOperator | null>(null);
  const [hasConnectedOperator, setHasConnectedOperator] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);
  const [wasConnectedBefore, setWasConnectedBefore] = useState(false);

  // Update configs when savedOperators changes
  useEffect(() => {
    console.log('[OperatorsTab] savedOperators changed:', savedOperators.length);
    
    const newConfigs = operators.reduce((acc, op) => {
      const saved = savedOperators.find(o => o.operator === op);
      if (saved) {
        console.log(`[OperatorsTab] Loading saved config for ${op}:`, {
          hasApiKey: !!saved.apiKey,
          hasEndpoint: !!saved.endpoint,
          hasModels: !!saved.models,
          modelsCount: saved.models?.length || 0,
          selectedModel: saved.selectedModel
        });
      }
      acc[op] = saved || {
        operator: op,
        apiKey: '',
        endpoint: '',
        selectedModel: '',
        models: []
      };
      return acc;
    }, {} as Record<AIOperator, AIOperatorConfig>);
    
    setConfigs(newConfigs);
    
    // Auto-show endpoint fields if they have values
    const endpointStates: Partial<Record<AIOperator, boolean>> = {};
    operators.forEach(op => {
      if (newConfigs[op]?.endpoint) {
        endpointStates[op] = true;
      }
    });
    setShowEndpoint(prev => ({ ...prev, ...endpointStates }));
    
    // Check if any operator is connected
    const hasConnected = Object.values(newConfigs).some(
      config => config.models && config.models.length > 0
    );
    
    // Проверяем, был ли баннер уже закрыт
    const bannerDismissed = localStorage.getItem(WELCOME_BANNER_DISMISSED_KEY);
    
    // Если есть подключенный оператор и это первый раз
    if (hasConnected && !wasConnectedBefore && !bannerDismissed) {
      // Сохраняем флаг, что баннер был показан
      localStorage.setItem(WELCOME_BANNER_DISMISSED_KEY, 'true');
    }
    
    // Если баннер был закрыт ранее, не показываем
    if (bannerDismissed) {
      setShowWelcomeBanner(false);
    }
    
    setWasConnectedBefore(hasConnected);
    setHasConnectedOperator(hasConnected);
  }, [savedOperators]);

  const handleApiKeyChange = (operator: AIOperator, apiKey: string) => {
    setConfigs(prev => ({
      ...prev,
      [operator]: { ...prev[operator], apiKey }
    }));
  };

  const handleEndpointChange = (operator: AIOperator, endpoint: string) => {
    setConfigs(prev => ({
      ...prev,
      [operator]: { ...prev[operator], endpoint }
    }));
  };

  const handleTest = async (operator: AIOperator) => {
    console.log('[OperatorsTab] Starting test for:', operator);
    setTesting(prev => ({ ...prev, [operator]: true }));
    setTestResults(prev => ({ ...prev, [operator]: null }));

    try {
      const config = configs[operator];
      console.log('[OperatorsTab] Testing config:', { operator, hasApiKey: !!config.apiKey, hasEndpoint: !!config.endpoint });
      
      const success = await testConnection(config);
      console.log('[OperatorsTab] Test result:', success);
      
      if (success) {
        // Load models
        console.log('[OperatorsTab] Loading models...');
        const models = await listModels(config);
        console.log('[OperatorsTab] Loaded models:', models.length);
        
        // Update local state with models
        const updatedConfig = { ...config, models };
        setConfigs(prev => ({
          ...prev,
          [operator]: updatedConfig
        }));
        
        // Cache models in storage
        console.log('[OperatorsTab] Caching models...');
        await storageAPI.cacheModels(operator, models);
        
        // Save configuration with models to settings store
        console.log('[OperatorsTab] Saving configuration...');
        const updatedOperators = [...savedOperators.filter(o => o.operator !== operator), updatedConfig];
        await updateOperators(updatedOperators);
        console.log('[OperatorsTab] Configuration saved successfully');
      }
      
      setTestResults(prev => ({ ...prev, [operator]: success }));
    } catch (error) {
      console.error('[OperatorsTab] Test failed:', error);
      setTestResults(prev => ({ ...prev, [operator]: false }));
    } finally {
      setTesting(prev => ({ ...prev, [operator]: false }));
    }
  };

  const handleModelSelect = async (operator: AIOperator, modelId: string) => {
    const updatedConfig = { ...configs[operator], selectedModel: modelId };
    setConfigs(prev => ({ ...prev, [operator]: updatedConfig }));
    
    // Save to settings
    const updatedOperators = [...savedOperators.filter(o => o.operator !== operator), updatedConfig];
    await updateOperators(updatedOperators);
  };

  const handleRemoveOperator = async (operator: AIOperator) => {
    console.log('[OperatorsTab] Removing operator:', operator);
    
    // Clear from local state
    const clearedConfig: AIOperatorConfig = {
      operator,
      apiKey: '',
      endpoint: '',
      selectedModel: '',
      models: []
    };
    
    setConfigs(prev => ({ ...prev, [operator]: clearedConfig }));
    setTestResults(prev => ({ ...prev, [operator]: null }));
    
    // Remove from settings store
    const updatedOperators = savedOperators.filter(o => o.operator !== operator);
    await updateOperators(updatedOperators);
    
    // Clear cached models
    await storageAPI.clearOperatorCache(operator);
    
    // Close dialog
    setOperatorToRemove(null);
    
    console.log('[OperatorsTab] Operator removed successfully');
  };

  const isOperatorConnected = (operator: AIOperator) => {
    return configs[operator].models && configs[operator].models!.length > 0;
  };

  return (
    <div className="space-y-6">
      {/* Welcome/Success Banner */}
      {showWelcomeBanner && (
        <div className={`border rounded-lg p-6 ${hasConnectedOperator ? 'bg-accent' : 'bg-muted'}`}>
          <div className="flex items-start gap-4">
            <div className={hasConnectedOperator ? 'animate-bounce' : 'animate-wave'}>
              {hasConnectedOperator ? (
                <PartyPopper className="h-12 w-12 text-primary" />
              ) : (
                <Hand className="h-12 w-12 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">
                {hasConnectedOperator ? t('welcomeSuccessTitle') : t('welcomeTitle')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {hasConnectedOperator ? t('welcomeSuccessMessage') : t('welcomeMessage')}
              </p>
            </div>
          </div>
        </div>
      )}

      {operators.map(operator => (
        <div key={operator} className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-3">
            <img 
              src={`/icons/ai/${operator}.png`} 
              alt={getOperatorName(operator)}
              className="w-8 h-8"
            />
            <h3 className="text-lg font-semibold">{getOperatorName(operator)}</h3>
            {AI_OPERATOR_LINKS[operator] && (
              <a
                href={AI_OPERATOR_LINKS[operator]}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-sm text-primary hover:underline"
              >
                {t('getApiKey')}
              </a>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${operator}-key`}>
              {operator === 'lmstudio' ? t('apiKeyOptional') : t('apiKey')}
            </Label>
            <div className="flex gap-2">
              <Input
                id={`${operator}-key`}
                type="password"
                value={configs[operator].apiKey}
                onChange={(e) => handleApiKeyChange(operator, e.target.value)}
                placeholder={operator === 'lmstudio' ? t('notRequired') : 'sk-...'}
              />
              <Button
                onClick={() => handleTest(operator)}
                disabled={
                  (operator !== 'lmstudio' && !configs[operator].apiKey) ||
                  (operator === 'lmstudio' && !configs[operator].endpoint) ||
                  testing[operator]
                }
              >
                {testing[operator] ? (
                  '...'
                ) : isOperatorConnected(operator) ? (
                  <RefreshCw className="h-4 w-4" />
                ) : (
                  t('testConnection')
                )}
              </Button>
              {isOperatorConnected(operator) && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => setOperatorToRemove(operator)}
                  title={t('removeOperator')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            {testResults[operator] === true && (
              <p className="text-sm text-green-600">{t('connectionSuccess')}</p>
            )}
            {testResults[operator] === false && (
              <p className="text-sm text-red-600">{t('connectionError')}</p>
            )}
          </div>

          {(operator === 'lmstudio' || operator === 'openrouter' || operator === 'grok') && (
            <div className="space-y-2">
              {operator !== 'lmstudio' && !showEndpoint[operator] && !configs[operator].endpoint ? (
                // Show link to reveal endpoint field for optional operators
                <button
                  type="button"
                  onClick={() => setShowEndpoint(prev => ({ ...prev, [operator]: true }))}
                  className="text-sm text-primary hover:underline"
                >
                  {t('addCustomEndpoint')}
                </button>
              ) : (
                // Show endpoint field
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${operator}-endpoint`}>
                      {operator === 'lmstudio' ? t('endpointRequired') : t('endpointOptional')}
                    </Label>
                    {operator !== 'lmstudio' && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowEndpoint(prev => ({ ...prev, [operator]: false }));
                          handleEndpointChange(operator, '');
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        {t('hide')}
                      </button>
                    )}
                  </div>
                  <Input
                    id={`${operator}-endpoint`}
                    value={configs[operator].endpoint || ''}
                    onChange={(e) => handleEndpointChange(operator, e.target.value)}
                    placeholder={
                      operator === 'lmstudio' 
                        ? 'http://localhost:1234/v1'
                        : operator === 'openrouter'
                        ? 'https://openrouter.ai/api/v1'
                        : 'https://api.x.ai/v1'
                    }
                  />
                </>
              )}
            </div>
          )}

          {operator === 'gemini' && (
            <div className="space-y-2">
            </div>
          )}

          {operator === 'openrouter' && (
            <div className="space-y-2">
            </div>
          )}

          {operator === 'lmstudio' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t('lmstudioDescription')}{' '}
                <a 
                  href={EXTERNAL_URLS.LMSTUDIO_DOWNLOAD} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  LM Studio
                </a>
                {' '}{t('lmstudioBeforeConnection')}
              </p>
            </div>
          )}

          {configs[operator].models && configs[operator].models!.length > 0 && (
            <div className="space-y-2">
              <Label>{t('selectModel')}</Label>
              <ModelCombobox
                models={configs[operator].models!}
                value={configs[operator].selectedModel}
                onValueChange={(value) => handleModelSelect(operator, value)}
                operator={operator}
                placeholder={t('selectModel')}
              />
            </div>
          )}
        </div>
      ))}

      {/* Confirm deletion dialog */}
      <AlertDialog open={operatorToRemove !== null} onOpenChange={() => setOperatorToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removeOperatorConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('removeOperatorConfirmMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => operatorToRemove && handleRemoveOperator(operatorToRemove)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

