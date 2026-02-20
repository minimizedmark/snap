'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { Phone, Mail, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();

  // Handle magic link token from URL
  useEffect(() => {
    const token = searchParams.get('token');
    const urlError = searchParams.get('error');

    if (urlError) {
      if (urlError === 'invalid_token') {
        setError('Invalid magic link');
      } else if (urlError === 'invalid_or_expired') {
        setError('Magic link expired or already used');
      }
    }

    if (token && !loading) {
      setLoading(true);
      signIn('magic-link', {
        token,
        redirect: false,
      }).then(async (result) => {
        if (result?.ok) {
          // Check if user needs onboarding
          const sessionRes = await fetch('/api/auth/session');
          const sessionData = await sessionRes.json();
          
          if (sessionData?.user) {
            // Check if user has completed onboarding
            const userRes = await fetch('/api/user/session');
            if (userRes.ok) {
              const userData = await userRes.json();
              if (userData.hasCompletedOnboarding === false) {
                router.push('/onboarding');
                return;
              }
            }
          }
          
          router.push('/dashboard');
        } else {
          setError('Failed to sign in. Please try again.');
          setLoading(false);
        }
      }).catch(() => {
        setError('Failed to sign in. Please try again.');
        setLoading(false);
      });
    }
  }, [searchParams, router, loading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const demoKey = searchParams.get('demo_key');

    try {
      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...(demoKey ? { demoKey } : {}) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send magic link');
      }

      // Dev mode: auto-login with returned token
      if (data.token) {
        const result = await signIn('magic-link', {
          token: data.token,
          redirect: false,
        });
        if (result?.ok) {
          const userRes = await fetch('/api/user/session');
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData.hasCompletedOnboarding === false) {
              router.push('/onboarding');
              return;
            }
          }
          router.push('/dashboard');
          return;
        }
      }

      setSent(true);
    } catch (err) {
      setError('Failed to send magic link. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b-4 border-safety-orange bg-deep-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-safety-orange rounded flex items-center justify-center border-2 border-white" style={{boxShadow: '0 0 10px rgba(255, 255, 255, 0.3)'}}>
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white uppercase tracking-wide">Snap Calls</h1>
              <p className="text-sm text-safety-orange font-bold uppercase tracking-wider">Never Miss A Job</p>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-deep-black uppercase tracking-wide">Welcome back</h2>
            <p className="mt-2 text-charcoal-text font-medium">
              Sign in or create a new account with your email
            </p>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-charcoal-text mb-2 uppercase tracking-wider">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-snap block w-full pl-10 pr-3 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-safety-orange focus:border-safety-orange snap-transition"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-500 text-red-700 px-4 py-3 rounded-lg font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-snap-light w-full flex items-center justify-center px-4 py-3 border-transparent text-base font-bold uppercase tracking-wide rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Sending magic link...
                  </>
                ) : (
                  'Continue with Email'
                )}
              </button>

              <div className="text-center">
                <p className="text-sm text-charcoal-text font-medium">
                  <strong className="text-safety-orange uppercase tracking-wider">New user?</strong> We&apos;ll create your account automatically!
                </p>
                <p className="text-xs text-charcoal-text mt-2 font-medium">
                  No passwords needed - just click the link we email you
                </p>
              </div>
            </form>
          ) : (
            <div className="mt-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-safety-orange rounded-full mb-4 border-2 border-white" style={{boxShadow: '0 0 15px rgba(255, 107, 0, 0.4)'}}>
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-deep-black mb-2 uppercase tracking-wide">Check your email!</h3>
              <p className="text-charcoal-text mb-4 font-medium">
                We&apos;ve sent a magic link to <strong className="text-safety-orange">{email}</strong>
              </p>
              <p className="text-sm text-charcoal-text font-medium">
                Click the link in the email to sign in. The link expires in 15 minutes.
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setEmail('');
                }}
                className="mt-6 text-safety-orange hover:underline font-bold uppercase tracking-wider"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-deep-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-safety-orange rounded flex items-center justify-center mx-auto mb-4 border-2 border-white" style={{boxShadow: '0 0 20px rgba(255, 107, 0, 0.5)'}}>
            <Phone className="w-10 h-10 text-white animate-pulse" />
          </div>
          <p className="text-white font-bold uppercase tracking-wider">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
