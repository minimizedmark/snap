import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey || apiKey !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { category } = await params;

  const templates = await prisma.adminMessageTemplate.findMany({
    where: {
      category,
      isActive: true,
    },
    orderBy: { version: 'desc' },
  });

  return NextResponse.json({ templates });
}
