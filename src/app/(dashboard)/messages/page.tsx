import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { MessageSquare, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const calls = await prisma.callLog.findMany({
    where: { userId: session.user.id, messageSent: { not: '' } },
    orderBy: { timestamp: 'desc' },
    take: 50,
    select: {
      id: true,
      callerNumber: true,
      callerName: true,
      timestamp: true,
      messageSent: true,
      smsStatus: true,
      smsMessageSid: true,
      responseType: true,
      customerReplied: true,
      customerReplyText: true,
    },
  });

  const statusIcon = (status: string | null) => {
    if (status === 'delivered' || status === 'sent') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (status === 'failed') return <XCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-deep-black uppercase tracking-wide">Messages</h1>
        <p className="text-charcoal-text mt-1">Every AI-written SMS we sent on your behalf</p>
      </div>

      <div className="bg-white rounded-lg border-2 border-gray-100 overflow-hidden">
        {calls.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 bg-safety-orange rounded mx-auto mb-4 flex items-center justify-center border-2 border-white" style={{boxShadow:'0 0 15px rgba(255,107,0,0.3)'}}>
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <p className="font-bold text-deep-black uppercase tracking-wide">No messages yet</p>
            <p className="text-gray-500 text-sm mt-1">Messages sent to callers will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {calls.map((call) => (
              <div key={call.id} className="p-4 sm:p-6 hover:bg-gray-50 snap-transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <p className="font-bold text-deep-black">{call.callerName || call.callerNumber}</p>
                      {call.callerName && <p className="text-xs text-gray-400">{call.callerNumber}</p>}
                      <div className="flex items-center space-x-1">
                        {statusIcon(call.smsStatus)}
                        <span className="text-xs text-gray-400 uppercase tracking-wide">{call.smsStatus || 'pending'}</span>
                      </div>
                    </div>
                    <div className="bg-safety-orange/5 border-l-4 border-safety-orange rounded-r-lg p-3 mb-2">
                      <p className="text-xs font-bold text-safety-orange uppercase tracking-wide mb-1">Sent</p>
                      <p className="text-sm text-charcoal-text">{call.messageSent}</p>
                    </div>
                    {call.customerReplied && call.customerReplyText && (
                      <div className="bg-gray-50 border-l-4 border-gray-300 rounded-r-lg p-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">They replied</p>
                        <p className="text-sm text-charcoal-text">{call.customerReplyText}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">{new Date(call.timestamp).toLocaleString()}</p>
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
