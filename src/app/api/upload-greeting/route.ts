import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['audio/webm', 'audio/wav', 'audio/mp4', 'audio/mpeg', 'audio/ogg'];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Storage service not configured' },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('audio') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: webm, wav, mp4, mpeg, ogg' },
        { status: 400 }
      );
    }

    // Get user's phone number for file naming
    const twilioConfig = await prisma.twilioConfig.findUnique({
      where: { userId: session.user.id },
    });

    const phoneNumber = twilioConfig?.phoneNumber?.replace(/\+/g, '') || 'unknown';
    const ext = file.type.split('/')[1] || 'webm';
    const fileName = `greetings/${session.user.id}_${phoneNumber}.${ext}`;

    const buffer = await file.arrayBuffer();

    // Delete any existing greeting files for this user
    const { data: existingFiles } = await supabase.storage
      .from('audio')
      .list('greetings', {
        search: `${session.user.id}_${phoneNumber}`,
      });

    if (existingFiles && existingFiles.length > 0) {
      const filesToRemove = existingFiles.map((f) => `greetings/${f.name}`);
      await supabase.storage.from('audio').remove(filesToRemove);
    }

    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload audio' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from('audio')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    await prisma.companyProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        greetingAudioUrl: publicUrl,
      },
      update: { greetingAudioUrl: publicUrl },
    });

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Error uploading greeting:', error);
    return NextResponse.json({ error: 'Failed to upload greeting' }, { status: 500 });
  }
}
