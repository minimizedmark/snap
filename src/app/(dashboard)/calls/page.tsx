import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { fromDecimal, formatCurrency } from '@/lib/pricing';
import { Phone, Voicemail, Clock, Star } from 'lucide-react';

const responseTypeLabel: Record<string, string> = {
  standard: 'Hang-up',
  voicemail: 'Voicemail',
  after_hours: 'After Hours',
};

export default async function CallsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const calls = await prisma.callLog.findMany({
    where: { userId: session.user.id },
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-deep-black uppercase tracking-wide">Call Logs</h1>
        <p className="text-charcoal-text mt-1">{calls.length} calls total</p>
      </div>

      <div className="bg-white rounded-lg border-2 border-gray-100 overflow-hidden">
        {calls.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 bg-safety-orange rounded mx-auto mb-4 flex items-center justify-center border-2 border-white" style={{boxShadow:'0 0 15px rgba(255,107,0,0.3)'}}>
              <Phone className="w-8 h-8 text-white" />
            </div>
            <p className="font-bold text-deep-black uppercase tracking-wide">No calls yet</p>
            <p className="text-gray-500 text-sm mt-1">Every missed call will be logged here with the message we sent.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {calls.map((call) => (
              <div key={call.id} className="p-4 sm:p-6 hover:bg-gray-50 snap-transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className={`mt-0.5 w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${call.hasVoicemail ? 'bg-purple-100' : call.responseType === 'after_hours' ? 'bg-blue-100' : 'bg-safety-orange/10'}`}>
                      {call.hasVoicemail
                        ? <Voicemail className="w-4 h-4 text-purple-600" />
                        : call.responseType === 'after_hours'
                        ? <Clock className="w-4 h-4 text-blue-600" />
                        : <Phone className="w-4 h-4 text-safety-orange" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <p className="font-bold text-deep-black">{call.callerName || call.callerNumber}</p>
                        {call.callerName && <p className="text-xs text-gray-400">{call.callerNumber}</p>}
                        {call.isVip && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-safety-orange text-white text-xs font-bold rounded uppercase">
                            <Star className="w-3 h-3" />
                            <span>VIP</span>
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase tracking-wide ${call.hasVoicemail ? 'bg-purple-100 text-purple-700' : call.responseType === 'after_hours' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {responseTypeLabel[call.responseType] || call.responseType}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{new Date(call.timestamp).toLocaleString()}</p>
                      {call.messageSent && (
                        <p className="text-sm text-charcoal-text mt-2 italic border-l-2 border-safety-orange pl-3">
                          &ldquo;{call.messageSent}&rdquo;
                        </p>
                      )}
                      {call.voicemailTranscription && (
                        <div className="mt-2 bg-purple-50 rounded p-2">
                          <p className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-1">Voicemail</p>
                          <p className="text-sm text-charcoal-text">{call.voicemailTranscription}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-deep-black">{formatCurrency(fromDecimal(call.totalCost))}</p>
                    <p className={`text-xs font-bold uppercase tracking-wide mt-1 ${call.smsStatus === 'delivered' || call.smsStatus === 'sent' ? 'text-green-600' : call.smsStatus === 'failed' ? 'text-red-500' : 'text-gray-400'}`}>
                      SMS {call.smsStatus || 'pending'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
