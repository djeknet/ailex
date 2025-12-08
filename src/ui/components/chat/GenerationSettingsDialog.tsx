import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/ui/components/ui/dialog';
import { Label } from '@/ui/components/ui/label';
import { Input } from '@/ui/components/ui/input';
import { Button } from '@/ui/components/ui/button';
import { Slider } from '@/ui/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/ui/components/ui/collapsible';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { useOperatorSettingsStore, GenerationSettings } from '@shared/stores/operatorSettingsStore';
import { useTranslation } from '@shared/i18n/useTranslation';
import { getModelInfo } from '@shared/constants';
import type { AIOperator } from '@shared/types/ai';

interface GenerationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator: AIOperator;
  modelId: string;
}

export default function GenerationSettingsDialog({
  open,
  onOpenChange,
  operator,
  modelId
}: GenerationSettingsDialogProps) {
  const { t } = useTranslation();
  const { getGenerationSettings, setGenerationSettings, resetGenerationSettings } = useOperatorSettingsStore();
  const currentSettings = getGenerationSettings(operator, modelId);
  
  const [temperature, setTemperature] = useState<number | undefined>(currentSettings.temperature);
  const [topP, setTopP] = useState<number | undefined>(currentSettings.top_p);
  const [topK, setTopK] = useState<number | undefined>(currentSettings.top_k);
  const [verbosity, setVerbosity] = useState<string | undefined>(currentSettings.verbosity);
  const [frequencyPenalty, setFrequencyPenalty] = useState<number | undefined>(currentSettings.frequency_penalty);
  const [presencePenalty, setPresencePenalty] = useState<number | undefined>(currentSettings.presence_penalty);
  const [repetitionPenalty, setRepetitionPenalty] = useState<number | undefined>(currentSettings.repetition_penalty);
  const [minP, setMinP] = useState<number | undefined>(currentSettings.min_p);
  const [topA, setTopA] = useState<number | undefined>(currentSettings.top_a);
  const [seed, setSeed] = useState<number | undefined>(currentSettings.seed);
  const [maxTokens, setMaxTokens] = useState<number | undefined>(currentSettings.max_tokens);
  const [stop, setStop] = useState<string>(currentSettings.stop?.join(', ') || '');
  const [responseFormat, setResponseFormat] = useState<string>(currentSettings.response_format?.type || 'none');
  
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [technicalOpen, setTechnicalOpen] = useState(false);

  // Get model info for supported parameters
  const modelInfo = getModelInfo(modelId, operator);
  const supportedParams = modelInfo?.supported_parameters || [];

  // Check if parameter is supported
  const isSupported = (param: string) => supportedParams.includes(param);

  // Update local state when settings change
  useEffect(() => {
    const settings = getGenerationSettings(operator, modelId);
    setTemperature(settings.temperature);
    setTopP(settings.top_p);
    setTopK(settings.top_k);
    setVerbosity(settings.verbosity);
    setFrequencyPenalty(settings.frequency_penalty);
    setPresencePenalty(settings.presence_penalty);
    setRepetitionPenalty(settings.repetition_penalty);
    setMinP(settings.min_p);
    setTopA(settings.top_a);
    setSeed(settings.seed);
    setMaxTokens(settings.max_tokens);
    setStop(settings.stop?.join(', ') || '');
    setResponseFormat(settings.response_format?.type || 'none');
  }, [operator, modelId, getGenerationSettings]);

  const handleSave = () => {
    const settings: GenerationSettings = {};
    
    if (temperature !== undefined) settings.temperature = temperature;
    if (topP !== undefined) settings.top_p = topP;
    if (topK !== undefined) settings.top_k = topK;
    if (verbosity) settings.verbosity = verbosity as 'low' | 'medium' | 'high';
    if (frequencyPenalty !== undefined) settings.frequency_penalty = frequencyPenalty;
    if (presencePenalty !== undefined) settings.presence_penalty = presencePenalty;
    if (repetitionPenalty !== undefined) settings.repetition_penalty = repetitionPenalty;
    if (minP !== undefined) settings.min_p = minP;
    if (topA !== undefined) settings.top_a = topA;
    if (seed !== undefined) settings.seed = seed;
    if (maxTokens !== undefined) settings.max_tokens = maxTokens;
    if (stop) settings.stop = stop.split(',').map(s => s.trim()).filter(Boolean);
    if (responseFormat && responseFormat !== 'none') settings.response_format = { type: responseFormat };
    
    setGenerationSettings(operator, modelId, settings);
  };

  const handleReset = () => {
    resetGenerationSettings(operator, modelId);
    setTemperature(undefined);
    setTopP(undefined);
    setTopK(undefined);
    setVerbosity(undefined);
    setFrequencyPenalty(undefined);
    setPresencePenalty(undefined);
    setRepetitionPenalty(undefined);
    setMinP(undefined);
    setTopA(undefined);
    setSeed(undefined);
    setMaxTokens(undefined);
    setStop('');
    setResponseFormat('none');
  };

  // Auto-save on change
  useEffect(() => {
    if (open) {
      handleSave();
    }
  }, [temperature, topP, topK, verbosity, frequencyPenalty, presencePenalty, repetitionPenalty, minP, topA, seed, maxTokens, stop, responseFormat]);

  if (supportedParams.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('generationSettings')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('generationSettingsNotAvailable')}
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('generationSettings')}</DialogTitle>
          <DialogDescription>
            {t('generationSettingsDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Основные параметры */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">{t('generationGroup_basic')}</h3>
            
            {isSupported('temperature') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="temperature">{t('generationParam_temperature')}</Label>
                  <span className="text-xs text-muted-foreground">{temperature?.toFixed(2) || '—'}</span>
                </div>
                <Slider
                  id="temperature"
                  min={0}
                  max={2}
                  step={0.1}
                  value={[temperature || 1]}
                  onValueChange={(vals) => setTemperature(vals[0])}
                />
                <p className="text-xs text-muted-foreground">
                  {t('generationParam_temperature_desc')}
                </p>
              </div>
            )}

            {isSupported('top_p') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="top_p">{t('generationParam_top_p')}</Label>
                  <span className="text-xs text-muted-foreground">{topP?.toFixed(2) || '—'}</span>
                </div>
                <Slider
                  id="top_p"
                  min={0}
                  max={1}
                  step={0.05}
                  value={[topP || 1]}
                  onValueChange={(vals) => setTopP(vals[0])}
                />
                <p className="text-xs text-muted-foreground">
                  {t('generationParam_top_p_desc')}
                </p>
              </div>
            )}

            {isSupported('top_k') && (
              <div className="space-y-2">
                <Label htmlFor="top_k">{t('generationParam_top_k')}</Label>
                <Input
                  id="top_k"
                  type="number"
                  min={0}
                  value={topK || ''}
                  onChange={(e) => setTopK(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  {t('generationParam_top_k_desc')}
                </p>
              </div>
            )}

            {isSupported('verbosity') && (
              <div className="space-y-2">
                <Label htmlFor="verbosity">{t('generationParam_verbosity')}</Label>
                <Select value={verbosity || 'medium'} onValueChange={setVerbosity}>
                  <SelectTrigger id="verbosity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('generationParam_verbosity_low')}</SelectItem>
                    <SelectItem value="medium">{t('generationParam_verbosity_medium')}</SelectItem>
                    <SelectItem value="high">{t('generationParam_verbosity_high')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('generationParam_verbosity_desc')}
                </p>
              </div>
            )}
          </div>

          {/* Контроль повторений */}
          {(isSupported('frequency_penalty') || isSupported('presence_penalty') || isSupported('repetition_penalty')) && (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">{t('generationGroup_repetition')}</h3>
              
              {isSupported('frequency_penalty') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="frequency_penalty">{t('generationParam_frequency_penalty')}</Label>
                    <span className="text-xs text-muted-foreground">{frequencyPenalty?.toFixed(2) || '—'}</span>
                  </div>
                  <Slider
                    id="frequency_penalty"
                    min={-2}
                    max={2}
                    step={0.1}
                    value={[frequencyPenalty || 0]}
                    onValueChange={(vals) => setFrequencyPenalty(vals[0])}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('generationParam_frequency_penalty_desc')}
                  </p>
                </div>
              )}

              {isSupported('presence_penalty') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="presence_penalty">{t('generationParam_presence_penalty')}</Label>
                    <span className="text-xs text-muted-foreground">{presencePenalty?.toFixed(2) || '—'}</span>
                  </div>
                  <Slider
                    id="presence_penalty"
                    min={-2}
                    max={2}
                    step={0.1}
                    value={[presencePenalty || 0]}
                    onValueChange={(vals) => setPresencePenalty(vals[0])}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('generationParam_presence_penalty_desc')}
                  </p>
                </div>
              )}

              {isSupported('repetition_penalty') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="repetition_penalty">{t('generationParam_repetition_penalty')}</Label>
                    <span className="text-xs text-muted-foreground">{repetitionPenalty?.toFixed(2) || '—'}</span>
                  </div>
                  <Slider
                    id="repetition_penalty"
                    min={0}
                    max={2}
                    step={0.1}
                    value={[repetitionPenalty || 1]}
                    onValueChange={(vals) => setRepetitionPenalty(vals[0])}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('generationParam_repetition_penalty_desc')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Расширенные параметры */}
          {(isSupported('min_p') || isSupported('top_a')) && (
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <h3 className="font-semibold text-sm">{t('generationGroup_advanced')}</h3>
                {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                {isSupported('min_p') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="min_p">{t('generationParam_min_p')}</Label>
                      <span className="text-xs text-muted-foreground">{minP?.toFixed(2) || '—'}</span>
                    </div>
                    <Slider
                      id="min_p"
                      min={0}
                      max={1}
                      step={0.05}
                      value={[minP || 0]}
                      onValueChange={(vals) => setMinP(vals[0])}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('generationParam_min_p_desc')}
                    </p>
                  </div>
                )}

                {isSupported('top_a') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="top_a">{t('generationParam_top_a')}</Label>
                      <span className="text-xs text-muted-foreground">{topA?.toFixed(2) || '—'}</span>
                    </div>
                    <Slider
                      id="top_a"
                      min={0}
                      max={1}
                      step={0.05}
                      value={[topA || 0]}
                      onValueChange={(vals) => setTopA(vals[0])}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('generationParam_top_a_desc')}
                    </p>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Технические параметры */}
          {(isSupported('seed') || isSupported('max_tokens') || isSupported('stop') || isSupported('response_format')) && (
            <Collapsible open={technicalOpen} onOpenChange={setTechnicalOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <h3 className="font-semibold text-sm">{t('generationGroup_technical')}</h3>
                {technicalOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                {isSupported('seed') && (
                  <div className="space-y-2">
                    <Label htmlFor="seed">{t('generationParam_seed')}</Label>
                    <Input
                      id="seed"
                      type="number"
                      value={seed || ''}
                      onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder={t('generationParam_seed_placeholder')}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('generationParam_seed_desc')}
                    </p>
                  </div>
                )}

                {isSupported('max_tokens') && (
                  <div className="space-y-2">
                    <Label htmlFor="max_tokens">{t('generationParam_max_tokens')}</Label>
                    <Input
                      id="max_tokens"
                      type="number"
                      min={1}
                      value={maxTokens || ''}
                      onChange={(e) => setMaxTokens(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder={t('generationParam_max_tokens_placeholder')}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('generationParam_max_tokens_desc')}
                    </p>
                  </div>
                )}

                {isSupported('stop') && (
                  <div className="space-y-2">
                    <Label htmlFor="stop">{t('generationParam_stop')}</Label>
                    <Input
                      id="stop"
                      type="text"
                      value={stop}
                      onChange={(e) => setStop(e.target.value)}
                      placeholder={t('generationParam_stop_placeholder')}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('generationParam_stop_desc')}
                    </p>
                  </div>
                )}

                {isSupported('response_format') && (
                  <div className="space-y-2">
                    <Label htmlFor="response_format">{t('generationParam_response_format')}</Label>
                    <Select value={responseFormat} onValueChange={setResponseFormat}>
                      <SelectTrigger id="response_format">
                        <SelectValue placeholder={t('generationParam_response_format_placeholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('generationParam_response_format_none')}</SelectItem>
                        <SelectItem value="json_object">{t('generationParam_response_format_json')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {t('generationParam_response_format_desc')}
                    </p>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('resetGenerationSettings')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

