'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingDown, TrendingUp, CreditCard } from 'lucide-react';

interface WalletData {
  balance: number;
  transactions: {
    id: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT';
    description: string;
    timestamp: string;
    balanceAfter: number;
  }[];
}

const DEPOSIT_OPTIONS = [
  { amount: 20, bonus: 0, label: '$20', total: 20 },
  { amount: 30, bonus: 4.5, label: '$30', total: 34.5 },
  { amount: 50, bonus: 12.5, label: '$50', total: 62.5 },
  { amount: 100, bonus: 50, label: '$100', total: 150 },
];

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDeposit, setSelectedDeposit] = useState<number | null>(null);
  const [depositing, setDepositing] = useState(false);

  useEffect(() => {
    fetch('/api/wallet/balance')
      .then((r) => r.json())
      .then((d) => { setWallet(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleDeposit = async () => {
    if (!selectedDeposit) return;
    setDepositing(true);
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: selectedDeposit }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setDepositing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 bg-safety-orange rounded flex items-center justify-center border-2 border-white animate-pulse" style={{boxShadow:'0 0 15px rgba(255,107,0,0.4)'}}>
          <DollarSign className="w-6 h-6 text-white" />
        </div>
      </div>
    );
  }

  const balance = wallet?.balance ?? 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-deep-black uppercase tracking-wide">Wallet</h1>
        <p className="text-charcoal-text mt-1">Add funds, track spending</p>
      </div>

      {/* Balance card */}
      <div
        className="bg-deep-black rounded-lg border-2 border-safety-orange p-8 text-center"
        style={{ boxShadow: '0 0 20px rgba(255,107,0,0.2)' }}
      >
        <p className="text-xs font-bold text-safety-orange uppercase tracking-widest mb-2">Current Balance</p>
        <p className="text-6xl font-bold text-white">${balance.toFixed(2)}</p>
        <p className="text-gray-400 text-sm mt-2">≈ {Math.floor(balance / 0.99)} calls remaining</p>
      </div>

      {/* Top up */}
      <div className="bg-white rounded-lg border-2 border-gray-100 p-6 space-y-4">
        <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide">Add Funds</h2>
        <div className="grid grid-cols-2 gap-3">
          {DEPOSIT_OPTIONS.map((opt) => (
            <button
              key={opt.amount}
              onClick={() => setSelectedDeposit(opt.amount)}
              className={`relative p-4 rounded-lg border-2 text-left snap-transition ${selectedDeposit === opt.amount ? 'border-safety-orange bg-safety-orange/5' : 'border-gray-200 hover:border-safety-orange/50'}`}
            >
              {opt.bonus > 0 && (
                <span className="absolute top-2 right-2 bg-safety-orange text-white text-xs font-bold px-2 py-0.5 rounded uppercase">
                  +{opt.bonus > 10 ? Math.round((opt.bonus / opt.amount) * 100) : Math.round((opt.bonus / opt.amount) * 100)}%
                </span>
              )}
              <p className="text-xl font-bold text-deep-black">{opt.label}</p>
              <p className="text-sm text-charcoal-text mt-1">
                = <span className="font-bold text-safety-orange">${opt.total.toFixed(0)} credit</span>
              </p>
              {opt.bonus > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">+${opt.bonus.toFixed(2)} bonus</p>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleDeposit}
          disabled={!selectedDeposit || depositing}
          className="w-full py-4 bg-safety-orange text-white font-bold uppercase tracking-wide rounded-lg snap-transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <CreditCard className="w-5 h-5" />
          <span>
            {depositing ? 'Redirecting...' : selectedDeposit ? `Deposit $${selectedDeposit}` : 'Select an amount'}
          </span>
        </button>
        <p className="text-xs text-gray-400 text-center">Secure payment via Stripe. No subscription, no surprise charges.</p>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-lg border-2 border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-gray-100">
          <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide">Transaction History</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {!wallet?.transactions?.length ? (
            <p className="px-6 py-8 text-gray-400 text-center text-sm">No transactions yet.</p>
          ) : (
            wallet.transactions.map((tx) => (
              <div key={tx.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${tx.type === 'CREDIT' ? 'bg-green-100' : 'bg-red-50'}`}>
                    {tx.type === 'CREDIT'
                      ? <TrendingUp className="w-4 h-4 text-green-600" />
                      : <TrendingDown className="w-4 h-4 text-red-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-deep-black">{tx.description}</p>
                    <p className="text-xs text-gray-400">{new Date(tx.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.type === 'CREDIT' ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">bal: ${tx.balanceAfter.toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
