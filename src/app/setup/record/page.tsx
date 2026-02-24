'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Phone,
  Mic,
  Square,
  RotateCcw,
  Save,
  CheckCircle,
  Loader2,
  ChevronLeft,
} from 'lucide-react';

export default function RecordPage() {
  const router = useRouter();

  // Profile data
  const [greetingScript, setGreetingScript] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaSupported, setMediaSupported] = useState(true);
  const [paceFeedback, setPaceFeedback] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Tempo calculation — target 150 wpm (2.5 words/sec)
  const wordCount = greetingScript.trim() ? greetingScript.trim().split(/\s+/).length : 0;
  const targetSeconds = wordCount > 0 ? Math.round(wordCount / 2.5) : 24;
  const minSeconds = Math.max(10, targetSeconds - 8);
  const maxSeconds = targetSeconds + 10;

  // Load existing profile
  useEffect(() => {
    fetch('/api/onboarding/company-profile')
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          if (data.profile.greetingScript) setGreetingScript(data.profile.greetingScript);
          // Unlock Complete Setup if already recorded
          if (data.profile.greetingAudioUrl) setUploadedUrl(data.profile.greetingAudioUrl);
        }
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.mediaDevices?.getUserMedia) {
      setMediaSupported(false);
    }
  }, []);

  // Tempo color based on recording time
  const getTempoColor = (seconds: number) => {
    if (seconds < minSeconds * 0.5) return 'bg-gray-300'; // warming up
    if (seconds <= maxSeconds) return 'bg-green-500';      // on pace
    if (seconds <= maxSeconds + 8) return 'bg-amber-500';  // running long
    return 'bg-red-500';                                    // too long
  };

  const getTempoLabel = (seconds: number) => {
    if (seconds < minSeconds * 0.5) return 'Warming up...';
    if (seconds <= maxSeconds) return 'On pace ✓';
    if (seconds <= maxSeconds + 8) return 'Running long...';
    return 'Too long — wrap up';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setRecordingTime(0);
      setPaceFeedback(null);
      setAudioBlob(null);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 30) {
            mediaRecorder.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setError('Microphone access denied. Please allow microphone access to record.');
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isRecording]);

  // Set pace feedback after recording stops
  useEffect(() => {
    if (!isRecording && recordingTime > 0 && audioBlob) {
      if (recordingTime < minSeconds) {
        setPaceFeedback('A bit fast — try speaking a little slower next time.');
      } else if (recordingTime <= maxSeconds) {
        setPaceFeedback('Perfect pace ✓');
      } else {
        setPaceFeedback('A bit long — try to be more concise next time.');
      }
    }
  }, [isRecording, audioBlob, recordingTime, minSeconds, maxSeconds]);

  const reRecord = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingTime(0);
    setPaceFeedback(null);
  };

  const uploadAudio = async () => {
    if (!audioBlob) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'greeting.webm');
      const res = await fetch('/api/upload-greeting', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setUploadedUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload recording');
    } finally {
      setUploading(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding/company-profile', { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to complete setup');
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
    } finally {
      setCompleting(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-safety-orange rounded flex items-center justify-center mx-auto mb-4 border-2 border-white" style={{ boxShadow: '0 0 20px rgba(255, 107, 0, 0.5)' }}>
            <Phone className="w-10 h-10 text-white animate-pulse" />
          </div>
          <p className="text-charcoal-text font-bold uppercase tracking-wider">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-deep-black border-b border-gray-800">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-safety-orange rounded flex items-center justify-center border-2 border-white" style={{ boxShadow: '0 0 10px rgba(255, 255, 255, 0.3)' }}>
                <Mic className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white uppercase tracking-wide">Record Your Greeting</h1>
                <p className="text-xs text-safety-orange font-bold uppercase tracking-wider">Final Step</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/setup')}
              className="flex items-center space-x-1 text-sm text-gray-400 hover:text-white snap-transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Script</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-6">

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-900">{error}</p>
            </div>
          )}

          {/* ─── Teleprompter ──────────────────────────────── */}
          <div className="bg-deep-black border-2 border-safety-orange rounded-lg p-6" style={{ boxShadow: '0 0 15px rgba(255, 107, 0, 0.2)' }}>
            <p className="text-xs font-bold text-safety-orange uppercase tracking-widest mb-4">
              YOUR SCRIPT — Read this while recording
            </p>
            {greetingScript ? (
              <p className="text-white text-xl leading-relaxed font-medium">
                {greetingScript}
              </p>
            ) : (
              <p className="text-gray-500 italic text-lg">
                No script found. Go back and write or generate your script first.
              </p>
            )}
          </div>

          {/* ─── Recording Controls ────────────────────────── */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 space-y-5">
            <h3 className="text-sm font-bold text-charcoal-text uppercase tracking-wider">Recording</h3>

            {!mediaSupported ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">Your browser does not support audio recording. Please use Chrome, Firefox, or Edge.</p>
              </div>
            ) : (
              <>
                {/* Timer & Pace Bar */}
                {(isRecording || (recordingTime > 0 && audioBlob)) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        {isRecording && <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />}
                        <span className="font-bold text-charcoal-text">{recordingTime}s / 30s max</span>
                      </div>
                      {isRecording && (
                        <span className={`font-bold text-sm ${
                          recordingTime <= maxSeconds ? 'text-green-600' :
                          recordingTime <= maxSeconds + 8 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {getTempoLabel(recordingTime)}
                        </span>
                      )}
                    </div>

                    {/* Target zone indicator */}
                    <div className="relative">
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        {/* Target zone highlight */}
                        <div
                          className="absolute top-0 h-3 bg-green-100 border-x border-green-300"
                          style={{
                            left: `${(minSeconds / 30) * 100}%`,
                            width: `${((maxSeconds - minSeconds) / 30) * 100}%`,
                          }}
                        />
                        {/* Progress bar */}
                        <div
                          className={`h-3 rounded-full snap-transition ${getTempoColor(recordingTime)}`}
                          style={{ width: `${(recordingTime / 30) * 100}%` }}
                        />
                      </div>
                      {/* Target zone labels */}
                      <div className="flex justify-between mt-1 text-xs text-gray-400">
                        <span>0s</span>
                        <span className="text-green-600 font-semibold">Target: {minSeconds}–{maxSeconds}s</span>
                        <span>30s</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pace feedback after stopping */}
                {paceFeedback && !isRecording && (
                  <div className={`rounded-lg px-4 py-3 text-sm font-bold ${
                    paceFeedback.startsWith('Perfect') ? 'bg-green-50 text-green-700 border border-green-200' :
                    'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {paceFeedback}
                  </div>
                )}

                {/* Control Buttons */}
                <div className="flex items-center space-x-3">
                  {!isRecording && !audioBlob && (
                    <button
                      onClick={startRecording}
                      className="btn-snap-light px-6 py-3 rounded-lg font-bold uppercase tracking-wide flex items-center space-x-2"
                    >
                      <Mic className="w-5 h-5" />
                      <span>Start Recording</span>
                    </button>
                  )}

                  {isRecording && (
                    <button
                      onClick={stopRecording}
                      className="px-6 py-3 bg-red-500 text-white rounded-lg font-bold uppercase tracking-wide flex items-center space-x-2 hover:bg-red-600 snap-transition"
                    >
                      <Square className="w-5 h-5" />
                      <span>Stop</span>
                    </button>
                  )}

                  {audioBlob && !isRecording && (
                    <>
                      <button
                        onClick={reRecord}
                        className="px-4 py-3 border-2 border-gray-300 text-charcoal-text rounded-lg font-bold uppercase tracking-wide flex items-center space-x-2 hover:bg-gray-50 snap-transition"
                      >
                        <RotateCcw className="w-5 h-5" />
                        <span>Re-record</span>
                      </button>
                      {!uploadedUrl && (
                        <button
                          onClick={uploadAudio}
                          disabled={uploading}
                          className="btn-snap-light px-6 py-3 rounded-lg font-bold uppercase tracking-wide flex items-center space-x-2 disabled:opacity-50"
                        >
                          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                          <span>{uploading ? 'Saving...' : 'Save Recording'}</span>
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Playback */}
                {audioUrl && (
                  <audio controls src={audioUrl} className="w-full" />
                )}

                {/* Saved confirmation */}
                {uploadedUrl && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-green-800 font-bold flex-1">Recording saved!</span>
                    <button
                      onClick={() => { reRecord(); setUploadedUrl(null); }}
                      className="text-sm text-safety-orange hover:text-[#E65F00] font-bold snap-transition"
                    >
                      Change
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ─── Complete Setup ────────────────────────────── */}
          <div className="space-y-3">
            {!uploadedUrl && (
              <p className="text-sm text-center text-gray-500">Save your recording above to unlock Complete Setup.</p>
            )}
            <button
              onClick={handleComplete}
              disabled={!uploadedUrl || completing}
              className="btn-snap-light w-full px-6 py-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-wide flex items-center justify-center space-x-2 text-lg"
            >
              {completing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              <span>{completing ? 'Completing Setup...' : 'Complete Setup'}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
