'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Loader2, AlertCircle, Check, Coins } from 'lucide-react';

interface AiUsage {
  used: number;
  limit: number;
  remaining: number;
}

interface AiStatus {
  tier: 'BASIC' | 'PRO';
  unlimited?: boolean;
  usage?: Record<string, AiUsage>;
  overageCost?: number;
}

interface AiTemplateAssistantProps {
  templateType: 'standardResponse' | 'voicemailResponse' | 'afterHoursResponse';
  currentTemplate: string;
  onApplySuggestion: (newTemplate: string) => void;
}

const TEMPLATE_LABELS = {
  standardResponse: 'Standard Response',
  voicemailResponse: 'Voicemail Response',
  afterHoursResponse: 'After-Hours Response',
};

/**
 * AI Template Assistant — BASIC tier component
 * Shows remaining free changes, overage costs, and AI-generated suggestions
 */
export function AiTemplateAssistant({
  templateType,
  currentTemplate,
  onApplySuggestion,
}: AiTemplateAssistantProps) {
  const [request, setRequest] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [charged, setCharged] = useState(false);
  const [chargeAmount, setChargeAmount] = useState(0);

  // Fetch AI usage status
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/ai-assist');
        if (res.ok) {
          setAiStatus(await res.json());
        }
      } catch {
        // Silently fail — status display is non-critical
      }
    }
    fetchStatus();
  }, []);

  const usage = aiStatus?.usage?.[templateType];
  const isOverLimit = usage ? usage.remaining === 0 : false;

  async function handleGenerate() {
    if (!request.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuggestion(null);
    setCharged(false);

    try {
      const res = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateType,
          userRequest: request.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          setError(`Insufficient balance. You need $${data.requiredAmount?.toFixed(2) || '0.25'} for this AI change. Current balance: $${data.currentBalance?.toFixed(2) || '0.00'}`);
        } else {
          setError(data.error || 'Failed to generate suggestion');
        }
        return;
      }

      setSuggestion(data.suggestion);
      setCharged(data.charged);
      setChargeAmount(data.chargeAmount);

      // Refresh status after change
      const statusRes = await fetch('/api/ai-assist');
      if (statusRes.ok) {
        setAiStatus(await statusRes.json());
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setIsLoading(false);
    }
  }

  function handleApply() {
    if (suggestion) {
      onApplySuggestion(suggestion);
      setSuggestion(null);
      setRequest('');
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-600" />
          <span className="text-sm font-medium text-cyan-800">
            AI Template Assistant
          </span>
        </div>

        {/* Usage badge */}
        {aiStatus && !aiStatus.unlimited && usage && (
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              usage.remaining > 0
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {usage.remaining > 0
              ? `${usage.remaining} free change${usage.remaining !== 1 ? 's' : ''} left`
              : `$${aiStatus.overageCost?.toFixed(2) || '0.25'}/change`}
          </span>
        )}

        {aiStatus?.unlimited && (
          <span className="text-xs px-2 py-1 rounded-full font-medium bg-purple-100 text-purple-700">
            PRO — Unlimited
          </span>
        )}
      </div>

      {/* Input */}
      <div className="space-y-2">
        <textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder={`Describe how you'd like to improve your ${TEMPLATE_LABELS[templateType].toLowerCase()}...`}
          className="w-full px-3 py-2 text-sm border border-cyan-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent resize-none"
          rows={2}
          disabled={isLoading}
        />

        {/* Overage warning */}
        {isOverLimit && !aiStatus?.unlimited && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700">
            <Coins className="w-3.5 h-3.5" />
            <span>
              Free changes used this month. This change will cost ${aiStatus?.overageCost?.toFixed(2) || '0.25'} from your wallet.
            </span>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isLoading || !request.trim()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Suggestion
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-md p-3">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Suggestion */}
      {suggestion && (
        <div className="mt-3 space-y-2">
          <div className="bg-white rounded-md border border-cyan-200 p-3">
            <p className="text-sm text-gray-700 font-medium mb-1">AI Suggestion:</p>
            <p className="text-sm text-gray-900">{suggestion}</p>
            {charged && (
              <p className="text-xs text-amber-600 mt-2">
                💰 ${chargeAmount.toFixed(2)} charged from wallet
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleApply}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Apply
            </button>
            <button
              onClick={() => setSuggestion(null)}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
