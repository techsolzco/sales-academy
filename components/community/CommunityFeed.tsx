'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createPost, createReply, pinPost, deletePost } from '@/lib/actions/community'
import { Pin, Trash2, MessageSquare, Send } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export interface CommunityPost {
  id: string
  content: string
  post_type: string
  is_pinned: boolean
  created_at: string
  profile: {
    full_name: string
    role: string
    avatar_url?: string
  }
  replies_count?: number
}

interface Props {
  initialPosts: CommunityPost[]
  currentUser: { id: string, role: string, full_name: string }
  isAdmin: boolean
}

export function CommunityFeed({ initialPosts, currentUser, isAdmin }: Props) {
  const { t } = useLanguage()
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts)
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostType, setNewPostType] = useState('general')
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('community')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts' }, async (payload) => {
        // Simple optimistic append or refetch logic - here just a simple placeholder implementation
        // Real implementation would fetch profile for new post.
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPostContent.trim()) return
    await createPost(newPostContent, newPostType)
    setNewPostContent('')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <form onSubmit={handleCreatePost}>
          <textarea
            value={newPostContent}
            onChange={e => setNewPostContent(e.target.value)}
            placeholder={t('community.placeholder')}
            className="w-full bg-gray-50 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 mb-3"
            rows={3}
          />
          <div className="flex justify-between items-center">
            <select
              value={newPostType}
              onChange={e => setNewPostType(e.target.value)}
              className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none"
            >
              <option value="general">{t('community.general')}</option>
              <option value="assignment_update">{t('community.assignmentUpdate')}</option>
              <option value="announcement">{t('community.announcement')}</option>
            </select>
            <button type="submit" className="bg-brand-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition flex items-center gap-2">
              <Send className="w-4 h-4" />
              {t('community.newPost')}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        {posts.map(post => (
          <div key={post.id} className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow border border-gray-100">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">
                  {post.profile?.full_name?.charAt(0) || '?'}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    {post.profile?.full_name}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase">
                      {post.profile?.role}
                    </span>
                  </h4>
                  <p className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {post.is_pinned && <Pin className="w-4 h-4 text-brand-600 fill-current" />}
                {isAdmin && (
                  <>
                    <button onClick={() => pinPost(post.id)} className="text-gray-400 hover:text-brand-600">
                      <Pin className="w-4 h-4" />
                    </button>
                    <button onClick={() => deletePost(post.id)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <p className="text-gray-700 text-sm mb-4 whitespace-pre-wrap">{post.content}</p>
            
            <div className="flex items-center gap-4 border-t border-gray-50 pt-3">
              <button 
                onClick={() => setExpandedReplies(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-brand-600 transition"
              >
                <MessageSquare className="w-4 h-4" />
                {post.replies_count || 0} Replies
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
