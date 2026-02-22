'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Phone, Loader2 } from 'lucide-react';

function DemoLoader() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const key = searchParams.get('k');

    if (!key) {
      setError('Missing demo key. Use the link provided by your sales contact.');
      setStatus('error');
      return;
    }

    (async () => {
      try {
        // Get a login token using the demo key
        const res = await fetch('/api/auth/demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to start demo');
        }

        // Sign in with the token
        const result = await signIn('magic-link', {
          token: data.token,
          redirect: false,
        });

        if (result?.ok) {
          router.push('/dashboard');
        } else {
          throw new Error('Sign in failed. Please try again.');
        }
      } catch (err: any) {
        setError(err.message || 'Something went wrong. Please try again.');
        setStatus('error');
      }
    })();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-deep-black flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-safety-orange rounded flex items-center justify-center mx-auto mb-6 border-2 border-white" style={{ boxShadow: '0 0 20px rgba(255, 107, 0, 0.5)' }}>
          <Phone className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white uppercase tracking-wide mb-2">Snap Calls</h1>
        <p className="text-safety-orange font-bold uppercase tracking-wider text-sm mb-8">Never Miss A Job</p>

        {status === 'loading' ? (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 text-safety-orange animate-spin" />
            <p className="text-white font-medium">Starting demo...</p>
          </div>
        ) : (
          <div className="bg-red-900/40 border border-red-500 rounded-lg p-4">
            <p className="text-red-300 font-medium">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-deep-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-safety-orange animate-spin" />
      </div>
    }>
      <DemoLoader />
    </Suspense>
  );
}
