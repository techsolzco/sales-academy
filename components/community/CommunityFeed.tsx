'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createPost, createReply, pinPost, deletePost, deleteReply, fetchCommunityPosts } from '@/lib/actions/community'
import { Pin, Trash2, MessageSquare, Send } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export interface CommunityReply {
  id: string
  post_id: string
  user_id: string
  content: string
  is_deleted: boolean
  created_at: string
  profile?: {
    full_name: string
    role: string
    avatar_url?: string
  }
}

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
  replies?: CommunityReply[]
  replies_count?: number
}

interface Props {
  initialPosts: CommunityPost[]
  currentUser: { id: string, role: string, full_name: string }
  isAdmin: boolean
}

export function CommunityFeed({ initialPosts, currentUser, isAdmin }: Props) {
  const { t } = useLanguage()
  const router = useRouter()
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts)
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostType, setNewPostType] = useState('general')
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({})
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})

  const refreshPosts = useCallback(async () => {
    const fresh = await fetchCommunityPosts()
    setPosts(fresh as CommunityPost[])
  }, [])

  // B48: the /dashboard/community and /admin/community pages query posts
  // directly and never include replies/replies_count, so hydrate from the
  // server action on mount when the initial payload has no replies.
  useEffect(() => {
    if (initialPosts.some(p => p.replies === undefined)) {
      refreshPosts()
    }
  }, [initialPosts, refreshPosts])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('community')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts' }, async () => {
        // B49: actually surface the new post — refetch so it is prepended
        // (pinned-first, newest-first) with its author profile attached,
        // instead of the old placeholder comment that did nothing.
        await refreshPosts()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [refreshPosts])

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPostContent.trim()) return
    const result = await createPost(newPostContent, newPostType)
    if (result.error || !result.data) {
      alert(result.error || 'Failed to create post')
      return
    }
    // B49: show the new post immediately — no manual reload needed.
    setPosts(prev => [{ ...(result.data as CommunityPost), replies: [], replies_count: 0 }, ...prev])
    setNewPostContent('')
    router.refresh()
  }

  const handlePinPost = async (postId: string) => {
    const result = await pinPost(postId)
    if (result.error) {
      alert(result.error)
      return
    }
    // B49: reflect the pin locally (pinned posts sort first) + refresh.
    setPosts(prev => {
      const updated = prev.map(p => p.id === postId ? { ...p, is_pinned: !p.is_pinned } : p)
      return [...updated].sort((a, b) =>
        Number(b.is_pinned) - Number(a.is_pinned) ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    })
    router.refresh()
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Delete this post?')) return
    const result = await deletePost(postId)
    if (result.error) {
      alert(result.error)
      return
    }
    setPosts(prev => prev.filter(p => p.id !== postId))
    router.refresh()
  }

  const handleCreateReply = async (postId: string) => {
    const content = (replyDrafts[postId] || '').trim()
    if (!content) return
    const result = await createReply(postId, content)
    if (result.error) {
      alert(result.error)
      return
    }
    // B48/B49: append the reply locally so it appears without a reload.
    const reply: CommunityReply = {
      id: `local-${Date.now()}`,
      post_id: postId,
      user_id: currentUser.id,
      content,
      is_deleted: false,
      created_at: new Date().toISOString(),
      profile: { full_name: currentUser.full_name, role: currentUser.role },
    }
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, replies: [...(p.replies ?? []), reply], replies_count: (p.replies_count ?? (p.replies ?? []).length) + 1 }
      : p
    ))
    setReplyDrafts(prev => ({ ...prev, [postId]: '' }))
    router.refresh()
  }

  const handleDeleteReply = async (postId: string, replyId: string) => {
    const result = await deleteReply(replyId)
    if (result.error) {
      alert(result.error)
      return
    }
    setPosts(prev => prev.map(p => p.id === postId
      ? {
          ...p,
          replies: (p.replies ?? []).filter(r => r.id !== replyId),
          replies_count: Math.max(0, (p.replies_count ?? (p.replies ?? []).length) - 1),
        }
      : p
    ))
    router.refresh()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <form onSubmit={handleCreatePost}>
          <textarea
            value={newPostContent}
            onChange={e => setNewPostContent(e.target.value)}
            placeholder={t('community.placeholder')}
            className="w-full bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 mb-3"
            rows={3}
          />
          <div className="flex justify-between items-center">
            <select
              value={newPostType}
              onChange={e => setNewPostType(e.target.value)}
              className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 focus:outline-none"
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
        {posts.map(post => {
          const replies = post.replies ?? []
          const repliesCount = post.replies_count ?? replies.length
          const expanded = !!expandedReplies[post.id]
          return (
          <div key={post.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                  {post.profile?.full_name?.charAt(0) || '?'}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    {post.profile?.full_name}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase">
                      {post.profile?.role}
                    </span>
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(post.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {post.is_pinned && <Pin className="w-4 h-4 text-brand-600 fill-current" />}
                {isAdmin && (
                  <>
                    <button onClick={() => handlePinPost(post.id)} className="text-gray-400 hover:text-brand-600">
                      <Pin className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeletePost(post.id)} className="text-gray-400 hover:text-red-500">
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
                {repliesCount} Replies
              </button>
            </div>

            {expanded && (
              <div className="mt-4 space-y-3">
                {replies.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500">No replies yet — be the first to reply.</p>
                ) : (
                  replies.map(reply => (
                    <div key={reply.id} className="flex gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {reply.profile?.full_name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{reply.profile?.full_name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase">
                            {reply.profile?.role}
                          </span>
                          <span className="text-[11px] text-gray-400">{new Date(reply.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mt-1">{reply.content}</p>
                      </div>
                      {(isAdmin || reply.user_id === currentUser.id) && (
                        <button
                          onClick={() => handleDeleteReply(post.id, reply.id)}
                          className="text-gray-400 hover:text-red-500 self-start"
                          title="Delete reply"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
                <div className="flex gap-2">
                  <input
                    value={replyDrafts[post.id] || ''}
                    onChange={e => setReplyDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateReply(post.id) } }}
                    placeholder="Write a reply..."
                    className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    onClick={() => handleCreateReply(post.id)}
                    className="bg-brand-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    Reply
                  </button>
                </div>
              </div>
            )}
          </div>
          )
        })}
      </div>
    </div>
  )
}
