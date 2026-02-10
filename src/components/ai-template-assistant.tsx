'use client';

import { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, Check } from 'lucide-react';

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
 * AI Template Assistant — helps users improve their SMS templates
 * Available to all users, unlimited, no extra charge.
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

  async function handleGenerate() {
    if (!request.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuggestion(null);

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
        setError(data.error || 'Failed to generate suggestion');
        return;
      }

      setSuggestion(data.suggestion);
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
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-cyan-600" />
        <span className="text-sm font-medium text-cyan-800">
          AI Template Assistant
        </span>
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
