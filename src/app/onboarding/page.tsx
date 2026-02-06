'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Building2, DollarSign, CheckCircle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

function PaymentForm({ onSuccess, amount, totalCredit }: { onSuccess: () => void; amount: number; totalCredit: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/onboarding`,
      },
      redirect: 'if_required',
    });

    if (submitError) {
      setError(submitError.message || 'Payment failed');
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-900">{error}</p>
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {loading ? 'Processing...' : `Deposit $${amount} (Get $${totalCredit.toFixed(2)} credit)`}
      </button>
    </form>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState(20);

  const [businessName, setBusinessName] = useState('');
  const [hoursStart, setHoursStart] = useState('09:00');
  const [hoursEnd, setHoursEnd] = useState('17:00');
  const [areaCode, setAreaCode] = useState('');

  const getBonusInfo = (amount: number) => {
    const bonuses: Record<number, { bonus: number; percentage: number }> = {
      20: { bonus: 0, percentage: 0 },
      30: { bonus: 4.5, percentage: 15 },
      50: { bonus: 12.5, percentage: 25 },
      100: { bonus: 50, percentage: 50 },
    };
    return bonuses[amount] || { bonus: 0, percentage: 0 };
  };

  const bonusInfo = getBonusInfo(depositAmount);
  const totalCredit = depositAmount + bonusInfo.bonus;

  const handleBusinessNext = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/onboarding/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, hoursStart, hoursEnd }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || 'Failed to save business info');
        return;
      }

      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleDepositStart = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: depositAmount }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || 'Failed to start deposit');
        return;
      }

      setClientSecret(data.clientSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setStep(3);
  };

  const handleNumberSetup = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/number/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaCode: areaCode || undefined }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || 'Failed to setup number');
        setLoading(false);
        return;
      }

      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
              <Phone className="w-6 h-6 text-cyan-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Snap Calls</h1>
              <p className="text-sm text-cyan-500 font-medium">Setup in a snap</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`flex items-center ${i < 4 ? 'flex-1' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${step >= i ? 'bg-cyan-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {i}
                  </div>
                  {i < 4 && <div className={`h-1 flex-1 mx-4 ${step > i ? 'bg-cyan-500' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className={step >= 1 ? 'text-cyan-600 font-medium' : 'text-gray-600'}>Business Info</span>
              <span className={step >= 2 ? 'text-cyan-600 font-medium' : 'text-gray-600'}>Load Wallet</span>
              <span className={step >= 3 ? 'text-cyan-600 font-medium' : 'text-gray-600'}>Get Number</span>
              <span className={step >= 4 ? 'text-cyan-600 font-medium' : 'text-gray-600'}>Complete</span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-8">
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Building2 className="w-6 h-6 text-cyan-500" />
                  <h2 className="text-2xl font-bold">Tell us about your business</h2>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                  <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent" placeholder="Acme HVAC" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Opens At</label>
                    <input type="time" value={hoursStart} onChange={(e) => setHoursStart(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Closes At</label>
                    <input type="time" value={hoursEnd} onChange={(e) => setHoursEnd(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent" />
                  </div>
                </div>
                <button onClick={handleBusinessNext} disabled={!businessName || loading} className="w-full px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium">
                  {loading ? 'Saving...' : 'Continue'}
                </button>
                {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-sm text-red-900">{error}</p></div>}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <DollarSign className="w-6 h-6 text-cyan-500" />
                  <h2 className="text-2xl font-bold">Load Your Wallet</h2>
                </div>
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-6 mb-6">
                  <p className="text-sm text-cyan-800 mb-3">There is a <strong>$5 setup fee</strong> for your Snap Calls forwarding number. It will be deducted from your wallet.</p>
                  <p className="text-sm text-cyan-700">💰 Minimum deposit: $20 • Larger deposits get bonus credits!</p>
                </div>
                {!clientSecret && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Select Deposit Amount</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { amount: 20, bonus: 0, label: '$20' },
                          { amount: 30, bonus: 4.5, label: '$30', badge: '15% bonus' },
                          { amount: 50, bonus: 12.5, label: '$50', badge: '25% bonus' },
                          { amount: 100, bonus: 50, label: '$100', badge: '50% bonus' },
                        ].map((option) => (
                          <button key={option.amount} type="button" onClick={() => setDepositAmount(option.amount)} className={`relative p-4 border-2 rounded-lg text-left transition-all ${depositAmount === option.amount ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 hover:border-cyan-300'}`}>
                            <div className="font-bold text-lg">{option.label}</div>
                            <div className="text-sm text-gray-600">= ${(option.amount + option.bonus).toFixed(2)} credit</div>
                            {option.badge && <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">{option.badge}</div>}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
                      By continuing, you agree to our <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:text-cyan-700 underline">Terms of Service</a>. Phone numbers remain property of Snap Calls and may be reassigned if your account is closed.
                    </div>
                  </>
                )}
                {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-sm text-red-900">{error}</p></div>}
                {!clientSecret ? (
                  <div className="flex space-x-4">
                    <button onClick={() => setStep(1)} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Back</button>
                    <button onClick={handleDepositStart} disabled={loading} className="flex-1 px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium">{loading ? 'Loading...' : `Continue with $${depositAmount}`}</button>
                  </div>
                ) : (
                  <>
                    {stripePromise ? (
                      <Elements stripe={stripePromise} options={{ clientSecret }}>
                        <PaymentForm onSuccess={handlePaymentSuccess} amount={depositAmount} totalCredit={totalCredit} />
                      </Elements>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-sm text-red-900">Stripe is not configured.</p></div>
                    )}
                  </>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Phone className="w-6 h-6 text-cyan-500" />
                  <h2 className="text-2xl font-bold">Get Your Forwarding Number</h2>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                  <p className="text-sm text-green-800 mb-2">✓ Wallet loaded successfully!</p>
                  <p className="text-sm text-green-700">Now we will assign you a dedicated forwarding number. The $5 setup fee will be deducted from your wallet.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Area Code (Optional)</label>
                  <input type="text" value={areaCode} onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent" placeholder="403, 587, etc." maxLength={3} />
                  <p className="text-sm text-gray-500 mt-1">We will try to assign a number with this area code, or the next available number.</p>
                </div>
                {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-sm text-red-900">{error}</p></div>}
                <button onClick={handleNumberSetup} disabled={loading} className="w-full px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium">{loading ? 'Setting up your number...' : 'Get My Number'}</button>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <CheckCircle className="w-6 h-6 text-cyan-500" />
                  <h2 className="text-2xl font-bold">You are all set!</h2>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-green-900 mb-2">Welcome to Snap Calls!</h3>
                  <p className="text-green-800 mb-4">Your forwarding number has been set up and is ready to start responding to missed calls.</p>
                  <p className="text-sm text-green-700">Next: Customize your message templates in the dashboard.</p>
                </div>
                <button onClick={() => router.push('/dashboard')} className="w-full px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 font-medium">Go to Dashboard</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
