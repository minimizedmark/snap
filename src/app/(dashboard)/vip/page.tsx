import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { Star, Phone, Calendar } from 'lucide-react';

export default async function VipPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const contacts = await prisma.vipContact.findMany({
    where: { userId: session.user.id },
    orderBy: { totalCalls: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-deep-black uppercase tracking-wide">VIP Contacts</h1>
          <p className="text-charcoal-text mt-1">Your most important callers get priority treatment</p>
        </div>
        <div
          className="w-10 h-10 bg-safety-orange rounded flex items-center justify-center border-2 border-white"
          style={{ boxShadow: '0 0 10px rgba(255,107,0,0.3)' }}
        >
          <Star className="w-5 h-5 text-white fill-white" />
        </div>
      </div>

      {contacts.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-gray-100 py-16 text-center">
          <div
            className="w-16 h-16 bg-safety-orange rounded mx-auto mb-4 flex items-center justify-center border-2 border-white"
            style={{ boxShadow: '0 0 15px rgba(255,107,0,0.3)' }}
          >
            <Star className="w-8 h-8 text-white fill-white" />
          </div>
          <p className="font-bold text-deep-black uppercase tracking-wide">No VIP contacts yet</p>
          <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">
            VIP contacts are flagged in call logs and can receive priority responses. Add them from call history.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border-2 border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {contacts.map((contact) => (
              <div key={contact.id} className="px-6 py-4 hover:bg-gray-50 snap-transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-10 h-10 bg-safety-orange rounded flex items-center justify-center border-2 border-white flex-shrink-0"
                      style={{ boxShadow: '0 0 8px rgba(255,107,0,0.3)' }}
                    >
                      <Star className="w-5 h-5 text-white fill-white" />
                    </div>
                    <div>
                      <p className="font-bold text-deep-black">{contact.name}</p>
                      <div className="flex items-center space-x-3 mt-0.5">
                        <div className="flex items-center space-x-1 text-xs text-gray-400">
                          <Phone className="w-3 h-3" />
                          <span>{contact.phoneNumber}</span>
                        </div>
                        {contact.lastCallDate && (
                          <div className="flex items-center space-x-1 text-xs text-gray-400">
                            <Calendar className="w-3 h-3" />
                            <span>Last: {new Date(contact.lastCallDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      {contact.notes && (
                        <p className="text-xs text-gray-500 mt-1 italic">{contact.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-deep-black">{contact.totalCalls}</p>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">calls</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-deep-black rounded-lg border-2 border-safety-orange p-4" style={{ boxShadow: '0 0 10px rgba(255,107,0,0.15)' }}>
        <p className="text-white text-sm font-bold uppercase tracking-wide">How to add VIP contacts</p>
        <p className="text-gray-400 text-sm mt-1">
          Go to Call Logs, find the caller you want to mark as VIP, and add them. VIPs are flagged in your dashboard and can trigger priority handling.
        </p>
      </div>
    </div>
  );
}
