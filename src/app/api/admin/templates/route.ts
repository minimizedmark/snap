import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const active = searchParams.get('active');

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (active !== null) where.isActive = active === 'true';

  const templates = await prisma.adminMessageTemplate.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, category, messageText, variables } = body;

  if (!name || !category || !messageText) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const template = await prisma.adminMessageTemplate.create({
    data: {
      name,
      category,
      messageText,
      variables: variables || [],
    },
  });

  return NextResponse.json({ template }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { id, name, category, messageText, variables, isActive } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing template id' }, { status: 400 });
  }

  const existing = await prisma.adminMessageTemplate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  // Auto-increment version if content changed
  const contentChanged = messageText !== undefined && messageText !== existing.messageText;

  const template = await prisma.adminMessageTemplate.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(messageText !== undefined && { messageText }),
      ...(variables !== undefined && { variables }),
      ...(isActive !== undefined && { isActive }),
      ...(contentChanged && { version: existing.version + 1 }),
    },
  });

  return NextResponse.json({ template });
}

export async function DELETE(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing template id' }, { status: 400 });
  }

  // Soft delete - set inactive
  const template = await prisma.adminMessageTemplate.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ template });
}
