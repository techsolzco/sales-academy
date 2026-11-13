import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Library, CheckCircle2, Pencil } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { fetchBankQuestions, fetchBankCategories } from '@/lib/actions/question-bank'
import { fetchAllQuizzes } from '@/lib/actions/quizzes'
import { QuestionBankForm } from './QuestionBankForm'
import { BankQuestionDeleteButton, AddToQuizPicker } from './QuestionBankActions'

export const dynamic = 'force-dynamic'

export default async function QuestionBankAdminPage({
  searchParams
}: {
  searchParams: { category?: string; tool?: string; search?: string; edit?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [bankRes, categoriesRes, quizzes, { data: tools }] = await Promise.all([
    fetchBankQuestions({
      category: searchParams.category || undefined,
      tool_id: searchParams.tool || undefined,
      search: searchParams.search || undefined,
    }),
    fetchBankCategories(),
    fetchAllQuizzes(),
    supabase.from('tools').select('id, name').is('deleted_at', null).order('name'),
  ])

  const questions = bankRes.data || []
  const categories = categoriesRes.data || []
  // ?edit=<id> opens the form in edit mode for that question (key remounts
  // the form so its state is seeded from the edited question).
  const editingQuestion = searchParams.edit
    ? questions.find((q: any) => q.id === searchParams.edit) || null
    : null

  return (
    <div className="px-4 py-5 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Question Bank</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Reusable questions — add any bank question to a quiz in one click.
          </p>
        </div>
        <Link
          href="/admin/quizzes"
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-brand-700 transition-colors"
        >
          <Library className="w-4 h-4" />
          Quizzes
        </Link>
      </div>

      {bankRes.error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm">
          {bankRes.error}
        </div>
      )}

      <QuestionBankForm
        key={editingQuestion?.id || 'new'}
        tools={tools || []}
        categories={categories}
        initial={editingQuestion}
      />

      <form method="get" className="flex flex-wrap items-end gap-3 mb-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search</label>
          <input
            name="search"
            defaultValue={searchParams.search || ''}
            placeholder="Search question text…"
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 w-64"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
          <select
            name="category"
            defaultValue={searchParams.category || ''}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tool</label>
          <select
            name="tool"
            defaultValue={searchParams.tool || ''}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="">All tools</option>
            {(tools || []).map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Filter
        </button>
        {(searchParams.search || searchParams.category || searchParams.tool) && (
          <Link href="/admin/question-bank" className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            Clear
          </Link>
        )}
      </form>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {questions.length === 0 ? (
          <div className="px-4 py-5 md:p-8">
            <EmptyState
              icon={Library}
              title="No bank questions yet"
              description="Create your first reusable question above, then add it to any quiz."
            />
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {questions.map((q: any) => (
              <li key={q.id} className="px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{q.question_text}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {q.category && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                          {q.category}
                        </span>
                      )}
                      {q.tool?.name && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          {q.tool.name}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 dark:text-gray-500 py-0.5">
                        {(q.options || []).length} options · {new Date(q.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <ul className="mt-3 space-y-1">
                      {(q.options || []).map((o: any) => (
                        <li key={o.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          {o.is_correct ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          ) : (
                            <span className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 flex-shrink-0" />
                          )}
                          <span className={o.is_correct ? 'font-medium text-gray-900 dark:text-gray-100' : ''}>
                            {o.option_text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/question-bank?edit=${q.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Link>
                      <BankQuestionDeleteButton questionId={q.id} />
                    </div>
                    <AddToQuizPicker bankQuestionId={q.id} quizzes={quizzes} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
