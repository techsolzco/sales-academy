import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const bucket = formData.get('bucket') as string | null
    const folder = formData.get('folder') as string | null

    if (!file || !bucket) {
      return NextResponse.json({ error: 'file and bucket are required' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${folder ? folder + '/' : ''}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const supabase = getServiceClient()
    const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    })
    
    if (error) throw error
    
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
    return NextResponse.json({ url: publicUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 })
  }
}
