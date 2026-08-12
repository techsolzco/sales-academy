import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CommunityFeed } from '@/components/community/CommunityFeed'

export default async function AdminCommunityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: posts } = await supabase
    .from('community_posts')
    .select('*, profile:profiles(full_name, role, avatar_url)')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  // Ideally fetch replies_count as well, skipping for mockup simplicity.

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Community</h1>
      </div>
      <CommunityFeed initialPosts={posts || []} currentUser={profile} isAdmin={true} />
    </div>
  )
}
