import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { fromDecimal, formatCurrency } from '@/lib/pricing';
import { Wallet, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import WalletDepositForm from './WalletDepositForm';

export default async function WalletPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      isTestAccount: true,
      wallet: true,
    },
  });

  if (!user) {
    redirect('/login');
  }

  const balance = user.wallet ? fromDecimal(user.wallet.balance) : 0;

  const transactions = await prisma.walletTransaction.findMany({
    where: { userId: session.user.id },
    orderBy: { timestamp: 'desc' },
    take: 20,
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Wallet</h1>
        <p className="text-gray-600 mt-1">Add funds and view your transaction history.</p>
      </div>

      {/* Balance card */}
      <div className="bg-deep-black rounded-xl p-6 flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Current Balance</p>
          <p className="text-4xl font-bold text-white mt-1">{formatCurrency(balance)}</p>
          {user.isTestAccount && (
            <span className="inline-block mt-2 text-xs bg-safety-orange/20 text-safety-orange font-bold uppercase tracking-wide px-2 py-0.5 rounded">
              Test Account
            </span>
          )}
        </div>
        <div className="w-16 h-16 bg-safety-orange rounded-xl flex items-center justify-center border-2 border-white" style={{ boxShadow: '0 0 20px rgba(255,107,0,0.4)' }}>
          <Wallet className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* Deposit form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide mb-4">Add Funds</h2>
        <WalletDepositForm isTestAccount={user.isTestAccount ?? false} currentBalance={balance} />
      </div>

      {/* Transaction history */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide">Transaction History</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {transactions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No transactions yet.</p>
            </div>
          ) : (
            transactions.map((tx) => {
              const isCredit = tx.type === 'CREDIT';
              return (
                <div key={tx.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isCredit ? 'bg-green-100' : 'bg-red-100'}`}>
                      {isCredit
                        ? <ArrowDownLeft className="w-4 h-4 text-green-600" />
                        : <ArrowUpRight className="w-4 h-4 text-red-500" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(tx.timestamp).toLocaleString()} · Balance after: {formatCurrency(fromDecimal(tx.balanceAfter))}
                      </p>
                    </div>
                  </div>
                  <p className={`font-bold text-sm ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                    {isCredit ? '+' : '-'}{formatCurrency(fromDecimal(tx.amount))}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
