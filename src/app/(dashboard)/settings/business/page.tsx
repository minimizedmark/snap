'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Trash2, Upload, Check, AlertCircle, Clock } from 'lucide-react';

type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading' | 'saved';

interface BusinessData {
  businessName: string;
  industry: string;
  hoursStart: string;
  hoursEnd: string;
  greetingUrl: string | null;
}

export default function SettingsPage() {
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(true);

  // Greeting recorder state
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch('/api/user/session')
      .then((r) => r.json())
      .then((d) => {
        setBusiness(d.businessSettings || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const startRecording = async () => {
    setUploadError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setRecordingState('recorded');
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start();
      mediaRecorderRef.current = mr;
      setRecordingSeconds(0);
      setRecordingState('recording');

      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          if (s >= 60) {
            stopRecording();
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setUploadError('Microphone access denied. Please allow microphone access and try again.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const playPreview = () => {
    if (!audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const discardRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingState('idle');
    setRecordingSeconds(0);
    setIsPlaying(false);
  };

  const uploadGreeting = async () => {
    if (!audioBlob) return;
    setRecordingState('uploading');
    setUploadError(null);

    const fd = new FormData();
    fd.append('audio', audioBlob, 'greeting.webm');

    try {
      const res = await fetch('/api/settings/greeting', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setBusiness((b) => b ? { ...b, greetingUrl: data.greetingUrl } : b);
      setRecordingState('saved');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      setRecordingState('recorded');
    }
  };

  const deleteGreeting = async () => {
    if (!confirm('Delete your greeting? Callers will hear a generic message until you record a new one.')) return;
    await fetch('/api/settings/greeting', { method: 'DELETE' });
    setBusiness((b) => b ? { ...b, greetingUrl: null } : b);
    setRecordingState('idle');
    discardRecording();
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 bg-safety-orange rounded flex items-center justify-center border-2 border-white" style={{boxShadow:'0 0 15px rgba(255,107,0,0.4)'}}>
          <Mic className="w-6 h-6 text-white animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-deep-black uppercase tracking-wide">Settings</h1>
        <p className="text-charcoal-text mt-1">{business?.businessName}</p>
      </div>

      {/* Greeting Recorder — the most important thing on this page */}
      <div className="bg-white rounded-lg border-2 border-gray-100 overflow-hidden">
        <div className="bg-deep-black px-6 py-4">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">Your Greeting</h2>
          <p className="text-gray-400 text-sm mt-1">
            This is what callers hear before they leave a message. Make it count.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Tips */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-xs font-bold text-deep-black uppercase tracking-wider">What to say</p>
            <p className="text-sm text-charcoal-text">
              <span className="font-bold">"Hi, you&apos;ve reached [Business Name]."</span> We can&apos;t take your call right now
              but leave a quick message — we&apos;ll text you back right away with everything you need.
            </p>
            <p className="text-xs text-gray-400 mt-2">Keep it under 30 seconds. Be friendly. End with "leave a message after the beep."</p>
          </div>

          {/* Current greeting status */}
          {business?.greetingUrl && recordingState !== 'recording' && recordingState !== 'recorded' && recordingState !== 'uploading' && (
            <div
              className="flex items-center justify-between bg-green-50 border-2 border-green-200 rounded-lg p-4"
            >
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-bold text-green-800 uppercase tracking-wide">Greeting active</p>
                  <p className="text-xs text-green-600 mt-0.5">Callers are hearing your recorded greeting</p>
                </div>
              </div>
              <button
                onClick={deleteGreeting}
                className="flex items-center space-x-1 text-red-500 hover:text-red-700 snap-transition text-xs font-bold uppercase tracking-wide"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          )}

          {!business?.greetingUrl && recordingState === 'idle' && (
            <div className="flex items-center space-x-3 bg-orange-50 border-2 border-safety-orange rounded-lg p-4">
              <AlertCircle className="w-5 h-5 text-safety-orange flex-shrink-0" />
              <p className="text-sm text-charcoal-text">
                <span className="font-bold">No greeting recorded.</span> Callers currently hear a generic system message.
              </p>
            </div>
          )}

          {/* Recorder UI */}
          <div className="flex flex-col items-center space-y-4 py-4">
            {(recordingState === 'idle' || recordingState === 'saved') && (
              <button
                onClick={startRecording}
                className="w-24 h-24 rounded-full bg-safety-orange flex items-center justify-center border-4 border-white snap-transition hover:scale-105 active:scale-95"
                style={{boxShadow:'0 0 20px rgba(255,107,0,0.5)'}}
              >
                <Mic className="w-10 h-10 text-white" />
              </button>
            )}

            {recordingState === 'recording' && (
              <>
                <button
                  onClick={stopRecording}
                  className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center border-4 border-white snap-transition hover:scale-105 active:scale-95 animate-pulse"
                  style={{boxShadow:'0 0 20px rgba(220,38,38,0.5)'}}
                >
                  <Square className="w-10 h-10 text-white fill-white" />
                </button>
                <div className="flex items-center space-x-2 text-red-600">
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                  <span className="font-bold text-lg tabular-nums">{formatTime(recordingSeconds)}</span>
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-400">/ 1:00 max</span>
                </div>
              </>
            )}

            {(recordingState === 'recorded' || recordingState === 'uploading') && (
              <div className="w-full space-y-4">
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={playPreview}
                    className="w-16 h-16 rounded-full bg-deep-black flex items-center justify-center border-2 border-white snap-transition hover:opacity-80"
                    style={{boxShadow:'0 0 10px rgba(255,255,255,0.2)'}}
                  >
                    <Play className={`w-8 h-8 text-white ${isPlaying ? 'opacity-50' : ''}`} />
                  </button>
                  <div className="text-center">
                    <p className="font-bold text-deep-black uppercase tracking-wide text-sm">
                      {isPlaying ? 'Playing...' : 'Preview ready'}
                    </p>
                    <p className="text-xs text-gray-400">{formatTime(recordingSeconds)} recorded</p>
                  </div>
                </div>

                {uploadError && (
                  <p className="text-red-500 text-sm text-center font-bold">{uploadError}</p>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={discardRecording}
                    disabled={recordingState === 'uploading'}
                    className="flex-1 flex items-center justify-center space-x-2 py-3 border-2 border-gray-300 rounded-lg text-charcoal-text font-bold uppercase tracking-wide text-sm snap-transition hover:border-red-400 hover:text-red-500 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Discard</span>
                  </button>
                  <button
                    onClick={uploadGreeting}
                    disabled={recordingState === 'uploading'}
                    className="flex-1 flex items-center justify-center space-x-2 py-3 bg-safety-orange rounded-lg text-white font-bold uppercase tracking-wide text-sm snap-transition hover:opacity-90 disabled:opacity-50"
                  >
                    {recordingState === 'uploading' ? (
                      <>
                        <Upload className="w-4 h-4 animate-bounce" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Save Greeting</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {recordingState === 'saved' && (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center border-4 border-white">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <p className="font-bold text-green-700 uppercase tracking-wide text-sm">Greeting saved!</p>
                <button
                  onClick={() => setRecordingState('idle')}
                  className="text-xs text-gray-400 hover:text-safety-orange snap-transition underline"
                >
                  Record a new one
                </button>
              </div>
            )}

            {recordingState === 'idle' && (
              <p className="text-xs text-gray-400 uppercase tracking-wide text-center">
                Tap to record • Max 60 seconds
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Business Hours (read-only for now) */}
      <div className="bg-white rounded-lg border-2 border-gray-100 p-6">
        <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-4">Business Hours</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Opens</p>
            <p className="font-bold text-deep-black text-lg">{business?.hoursStart || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Closes</p>
            <p className="font-bold text-deep-black text-lg">{business?.hoursEnd || '—'}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4 flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>Hours affect which auto-response callers receive after hours.</span>
        </p>
      </div>
    </div>
  );
}
