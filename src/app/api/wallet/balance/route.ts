import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getWalletBalance } from '@/lib/wallet';
import { prisma } from '@/lib/prisma';
import { fromDecimal } from '@/lib/pricing';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [balance, txRows] = await Promise.all([
      getWalletBalance(session.user.id),
      prisma.walletTransaction.findMany({
        where: { userId: session.user.id },
        orderBy: { timestamp: 'desc' },
        take: 50,
      }),
    ]);

    const transactions = txRows.map((tx) => ({
      id: tx.id,
      amount: fromDecimal(tx.amount),
      type: tx.type,
      description: tx.description,
      timestamp: tx.timestamp.toISOString(),
      balanceAfter: fromDecimal(tx.balanceAfter),
    }));

    return NextResponse.json({ balance, transactions });
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    return NextResponse.json({ error: 'Failed to get balance' }, { status: 500 });
  }
}
