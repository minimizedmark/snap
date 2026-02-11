'use client';

import { useState, useEffect } from 'react';
import { Brain, Save, Loader2, AlertCircle, Check } from 'lucide-react';

interface AiInstructionsSettingsProps {
  initialInstructions?: string | null;
}

/**
 * AI Instructions Settings
 * Allows users to customize how AI generates responses for their business.
 * These instructions are used by the AI when generating:
 * - Dynamic call responses (voicemail-based)
 * - Template improvement suggestions
 */
export function AiInstructionsSettings({
  initialInstructions,
}: AiInstructionsSettingsProps) {
  const [instructions, setInstructions] = useState(initialInstructions || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Clear save status after 3 seconds
  useEffect(() => {
    if (saveStatus === 'success') {
      const timer = setTimeout(() => setSaveStatus('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSaveStatus('idle');

    try {
      const res = await fetch('/api/user/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiInstructions: instructions.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save AI instructions');
      }

      setSaveStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }

  const hasChanges = instructions !== (initialInstructions || '');

  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Brain className="w-5 h-5 text-purple-600" />
        <h3 className="text-base font-semibold text-purple-900">
          AI Response Instructions
        </h3>
      </div>
      <p className="text-sm text-purple-700 mb-4">
        Customize how AI generates responses for your business. These instructions guide
        the AI when creating dynamic SMS responses from voicemails and improving your templates.
      </p>

      {/* Instructions textarea */}
      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder={`Example instructions:
• Always mention we offer free estimates
• Use a warm, Southern hospitality tone
• Include our website myplumbing.com in responses
• For VIP clients, mention their loyalty discount
• Never use emojis in messages
• Always remind callers about our 24/7 emergency line`}
        className="w-full px-4 py-3 text-sm border border-purple-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-y min-h-[120px]"
        rows={6}
        disabled={isSaving}
      />

      {/* Character count */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-purple-500">
          {instructions.length}/500 characters
        </span>

        <div className="flex items-center gap-2">
          {/* Save status */}
          {saveStatus === 'success' && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="w-3.5 h-3.5" />
              Saved
            </span>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Instructions
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-md p-3">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* How it works */}
      <div className="mt-4 pt-4 border-t border-purple-200">
        <p className="text-xs font-medium text-purple-800 mb-2">How it works:</p>
        <ul className="text-xs text-purple-700 space-y-1">
          <li>• When a caller leaves a voicemail, AI transcribes it and reads your instructions</li>
          <li>• A personalized SMS response is generated based on the voicemail content</li>
          <li>• Your instructions shape the tone, style, and content of every AI response</li>
          <li>• All AI features are included in your plan — no extra charges</li>
        </ul>
      </div>
    </div>
  );
}
