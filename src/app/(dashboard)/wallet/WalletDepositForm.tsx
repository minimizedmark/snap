'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CheckCircle, Loader2 } from 'lucide-react';

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

const DEPOSIT_OPTIONS = [
  { amount: 20, bonus: 0, label: '$20', sublabel: 'No bonus' },
  { amount: 30, bonus: 4.5, label: '$30', sublabel: '+$4.50 bonus (15%)' },
  { amount: 50, bonus: 12.5, label: '$50', sublabel: '+$12.50 bonus (25%)' },
  { amount: 100, bonus: 50, label: '$100', sublabel: '+$50.00 bonus (50%)' },
];

function StripePaymentForm({
  amount,
  totalCredit,
  onSuccess,
}: {
  amount: number;
  totalCredit: number;
  onSuccess: (newBalance: number) => void;
}) {
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
        return_url: `${window.location.origin}/wallet`,
      },
      redirect: 'if_required',
    });

    if (submitError) {
      setError(submitError.message || 'Payment failed');
      setLoading(false);
    } else {
      // Webhook will credit wallet; optimistically show success
      onSuccess(0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <PaymentElement />
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-900">{error}</p>
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-safety-orange text-white font-bold uppercase tracking-wide py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
        ) : (
          `Pay $${amount} → Get $${totalCredit.toFixed(2)} credit`
        )}
      </button>
    </form>
  );
}

export default function WalletDepositForm({
  isTestAccount,
  currentBalance,
}: {
  isTestAccount: boolean;
  currentBalance: number;
}) {
  const [selectedAmount, setSelectedAmount] = useState(20);
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [success, setSuccess] = useState(false);
  const [newBalance, setNewBalance] = useState<number | null>(null);
  const [error, setError] = useState('');

  const selected = DEPOSIT_OPTIONS.find((o) => o.amount === selectedAmount)!;
  const totalCredit = selected.amount + selected.bonus;

  const handleDeposit = async () => {
    setLoading(true);
    setError('');
    setClientSecret('');

    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: selectedAmount }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      if (data.testAccount) {
        setNewBalance(data.newBalance);
        setSuccess(true);
      } else {
        setClientSecret(data.clientSecret);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">Funds Added!</h3>
        {newBalance !== null && newBalance > 0 && (
          <p className="text-gray-600">
            New balance:{' '}
            <span className="font-bold text-gray-900">
              ${newBalance.toFixed(2)}
            </span>
          </p>
        )}
        <p className="text-gray-500 text-sm mt-1">
          ${totalCredit.toFixed(2)} credited to your wallet
        </p>
        <button
          onClick={() => {
            setSuccess(false);
            setNewBalance(null);
            setSelectedAmount(20);
          }}
          className="mt-6 text-safety-orange font-bold text-sm uppercase tracking-wide hover:underline"
        >
          Add more funds
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Amount selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {DEPOSIT_OPTIONS.map((opt) => (
          <button
            key={opt.amount}
            onClick={() => {
              setSelectedAmount(opt.amount);
              setClientSecret('');
              setError('');
            }}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              selectedAmount === opt.amount
                ? 'border-safety-orange bg-safety-orange/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className="text-lg font-bold text-gray-900">{opt.label}</p>
            <p className={`text-xs mt-0.5 ${opt.bonus > 0 ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
              {opt.sublabel}
            </p>
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
        <span className="text-gray-600 text-sm">You pay</span>
        <span className="font-bold text-gray-900">${selected.amount}.00</span>
      </div>
      {selected.bonus > 0 && (
        <div className="bg-green-50 rounded-lg p-4 flex items-center justify-between -mt-1">
          <span className="text-green-700 text-sm font-medium">Bonus credit</span>
          <span className="font-bold text-green-700">+${selected.bonus.toFixed(2)}</span>
        </div>
      )}
      <div className="bg-safety-orange/10 rounded-lg p-4 flex items-center justify-between border border-safety-orange/30">
        <span className="text-gray-900 font-bold text-sm uppercase tracking-wide">Total wallet credit</span>
        <span className="font-bold text-safety-orange text-lg">${totalCredit.toFixed(2)}</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-900">{error}</p>
        </div>
      )}

      {/* Test account: instant credit */}
      {isTestAccount && !clientSecret && (
        <button
          onClick={handleDeposit}
          disabled={loading}
          className="w-full bg-safety-orange text-white font-bold uppercase tracking-wide py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Adding funds...</>
          ) : (
            `Add $${totalCredit.toFixed(2)} to Wallet`
          )}
        </button>
      )}

      {/* Real account: Stripe flow */}
      {!isTestAccount && !clientSecret && (
        <button
          onClick={handleDeposit}
          disabled={loading}
          className="w-full bg-safety-orange text-white font-bold uppercase tracking-wide py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Loading payment...</>
          ) : (
            `Continue to Payment`
          )}
        </button>
      )}

      {/* Stripe Elements */}
      {!isTestAccount && clientSecret && stripePromise && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <StripePaymentForm
            amount={selected.amount}
            totalCredit={totalCredit}
            onSuccess={(bal) => {
              setNewBalance(bal);
              setSuccess(true);
            }}
          />
        </Elements>
      )}
    </div>
  );
}
