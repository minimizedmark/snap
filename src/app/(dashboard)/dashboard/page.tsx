import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { fromDecimal, formatCurrency } from '@/lib/pricing';
import { Phone, DollarSign, MessageSquare, TrendingUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { wallet: true, businessSettings: true, twilioConfig: true },
  });

  if (!user) redirect('/login');
  if (!user.businessSettings || !user.twilioConfig) redirect('/onboarding');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalCalls, todayCalls, weekCalls, walletBalance] = await Promise.all([
    prisma.callLog.count({ where: { userId: user.id } }),
    prisma.callLog.count({ where: { userId: user.id, timestamp: { gte: today } } }),
    prisma.callLog.count({ where: { userId: user.id, timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    user.wallet ? fromDecimal(user.wallet.balance) : 0,
  ]);

  const recentCalls = await prisma.callLog.findMany({
    where: { userId: user.id },
    orderBy: { timestamp: 'desc' },
    take: 5,
    select: { id: true, callerNumber: true, callerName: true, timestamp: true, responseType: true, isVip: true, hasVoicemail: true, totalCost: true, smsStatus: true },
  });

  const hasGreeting = !!user.businessSettings.greetingUrl;
  const lowBalance = walletBalance < 5;
  const responseTypeLabel: Record<string, string> = { standard: 'Hang-up', voicemail: 'Voicemail', after_hours: 'After Hours' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-deep-black uppercase tracking-wide">Dashboard</h1>
          <p className="text-charcoal-text mt-1 font-medium">{user.businessSettings.businessName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">{user.subscriptionType === 'SNAPLINE' ? 'SnapLine' : 'Basic'} Plan</p>
          <p className="text-xs text-gray-400">{user.twilioConfig.phoneNumber}</p>
        </div>
      </div>

      {!hasGreeting && (
        <div className="bg-deep-black border-2 border-safety-orange rounded-lg p-4 flex items-start space-x-3" style={{boxShadow:'0 0 10px rgba(255,107,0,0.2)'}}>
          <AlertCircle className="w-5 h-5 text-safety-orange flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-white font-bold uppercase tracking-wide text-sm">No greeting recorded</p>
            <p className="text-gray-400 text-sm mt-1">Callers hear a generic TTS message. Record your greeting to make it personal.</p>
          </div>
          <Link href="/settings/business" className="flex-shrink-0 bg-safety-orange text-white px-4 py-2 rounded font-bold uppercase tracking-wide text-xs snap-transition hover:opacity-90">Record Now</Link>
        </div>
      )}

      {lowBalance && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-yellow-800 font-bold uppercase tracking-wide text-sm">Low wallet — ${walletBalance.toFixed(2)} remaining</p>
            <p className="text-yellow-700 text-sm mt-1">Add funds to keep catching missed calls.</p>
          </div>
          <Link href="/wallet" className="flex-shrink-0 bg-yellow-500 text-white px-4 py-2 rounded font-bold uppercase tracking-wide text-xs hover:opacity-90 snap-transition">Top Up</Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border-2 border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Today</p>
              <p className="text-4xl font-bold text-deep-black mt-1">{todayCalls}</p>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">Calls Caught</p>
            </div>
            <div className="w-12 h-12 bg-safety-orange rounded flex items-center justify-center border-2 border-white" style={{boxShadow:'0 0 10px rgba(255,107,0,0.3)'}}>
              <Phone className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border-2 border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">This Week</p>
              <p className="text-4xl font-bold text-deep-black mt-1">{weekCalls}</p>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">Calls Caught</p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border-2 border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">All Time</p>
              <p className="text-4xl font-bold text-deep-black mt-1">{totalCalls}</p>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">Total Calls</p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-deep-black rounded-lg border-2 border-safety-orange p-6" style={{boxShadow:'0 0 15px rgba(255,107,0,0.2)'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-safety-orange uppercase tracking-wider">Wallet</p>
              <p className="text-4xl font-bold text-white mt-1">{formatCurrency(walletBalance)}</p>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">Balance</p>
            </div>
            <div className="w-12 h-12 bg-safety-orange rounded flex items-center justify-center border-2 border-white" style={{boxShadow:'0 0 10px rgba(255,255,255,0.3)'}}>
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border-2 border-gray-100">
        <div className="px-6 py-4 border-b-2 border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide">Recent Calls</h2>
          <Link href="/calls" className="text-xs font-bold text-safety-orange uppercase tracking-wide hover:opacity-70 snap-transition">View All →</Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recentCalls.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="w-16 h-16 bg-safety-orange rounded mx-auto mb-4 flex items-center justify-center border-2 border-white" style={{boxShadow:'0 0 15px rgba(255,107,0,0.3)'}}>
                <Phone className="w-8 h-8 text-white" />
              </div>
              <p className="font-bold text-deep-black uppercase tracking-wide">Standing by</p>
              <p className="text-gray-500 text-sm mt-1">Your missed calls will appear here the moment they come in.</p>
            </div>
          ) : (
            recentCalls.map((call) => (
              <div key={call.id} className="px-6 py-4 hover:bg-gray-50 snap-transition">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-bold text-deep-black">{call.callerName || call.callerNumber}</p>
                      {call.isVip && <span className="px-2 py-0.5 bg-safety-orange text-white text-xs font-bold rounded uppercase">VIP</span>}
                      {call.hasVoicemail && <span className="px-2 py-0.5 bg-deep-black text-white text-xs font-bold rounded uppercase">VM</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
                      {new Date(call.timestamp).toLocaleString()} • {responseTypeLabel[call.responseType] || call.responseType}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-deep-black">{formatCurrency(fromDecimal(call.totalCost))}</p>
                    <p className={`text-xs font-bold uppercase tracking-wide ${call.smsStatus === 'delivered' || call.smsStatus === 'sent' ? 'text-green-600' : call.smsStatus === 'failed' ? 'text-red-500' : 'text-gray-400'}`}>{call.smsStatus || 'pending'}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
