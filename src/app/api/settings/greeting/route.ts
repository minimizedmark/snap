import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = 'audio';
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/settings/greeting
 * Accepts a multipart form with an 'audio' file.
 * Uploads it to Supabase Storage (audio bucket) and saves the public URL
 * to business_settings.greeting_url so /api/voice can play it.
 *
 * DELETE /api/settings/greeting
 * Removes the greeting from Supabase Storage and clears the URL.
 */

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const audioFile = formData.get('audio') as File | null;

  if (!audioFile) {
    return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
  }

  if (audioFile.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
  }

  const allowedTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
  if (!allowedTypes.includes(audioFile.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }

  // Determine extension from mime type
  const extMap: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
  };
  const ext = extMap[audioFile.type] || 'webm';
  const filePath = `greetings/${userId}/greeting.${ext}`;

  const arrayBuffer = await audioFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Delete old file if it exists (upsert)
  await supabase.storage.from(BUCKET).remove([filePath]);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: audioFile.type,
      upsert: true,
    });

  if (uploadError) {
    console.error('❌ Supabase Storage upload error:', uploadError);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  const greetingUrl = urlData.publicUrl;

  // Save to DB
  await prisma.businessSettings.update({
    where: { userId },
    data: { greetingUrl },
  });

  console.log('✅ Greeting uploaded:', { userId, greetingUrl });

  return NextResponse.json({ success: true, greetingUrl });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // Try to remove all possible extensions
  const extensions = ['webm', 'm4a', 'mp3', 'wav', 'ogg'];
  const paths = extensions.map((ext) => `greetings/${userId}/greeting.${ext}`);
  await supabase.storage.from(BUCKET).remove(paths);

  await prisma.businessSettings.update({
    where: { userId },
    data: { greetingUrl: null },
  });

  return NextResponse.json({ success: true });
}
