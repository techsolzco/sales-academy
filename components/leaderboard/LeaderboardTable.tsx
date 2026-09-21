'use client'

import { useState } from 'react'
import { Trophy, HelpCircle } from 'lucide-react'
import type { LeaderboardEntry } from '@/types'

interface Props {
  entries: LeaderboardEntry[]
  currentUserId?: string
}

export function LeaderboardTable({ entries, currentUserId }: Props) {
  // Ensure entries have ranks
  const rankedEntries = entries.map((entry, index) => ({
    ...entry,
    rank: entry.rank || index + 1
  }))

  const top10 = rankedEntries.slice(0, 10)
  const currentUserEntry = rankedEntries.find(e => e.user_id === currentUserId)
  
  const showCurrentUserAtBottom = currentUserEntry && (currentUserEntry.rank || 0) > 10

  const getRankMedal = (rank: number) => {
    switch (rank) {
      case 1: return <span className="text-2xl drop-shadow-sm" title="1st Place">🥇</span>
      case 2: return <span className="text-2xl drop-shadow-sm" title="2nd Place">🥈</span>
      case 3: return <span className="text-2xl drop-shadow-sm" title="3rd Place">🥉</span>
      default: return <span className="text-gray-500 font-bold w-8 text-center">{rank}</span>
    }
  }

  const Row = ({ entry, isCurrentUser }: { entry: LeaderboardEntry, isCurrentUser: boolean }) => (
    <div className={`flex items-center p-3 sm:p-4 rounded-xl transition-all duration-200 hover:shadow-md ${isCurrentUser ? 'bg-gradient-to-r from-brand-50 dark:from-brand-900/30 to-white dark:to-gray-800 border border-brand-500 shadow-sm' : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-brand-200 dark:hover:border-brand-600'}`}>
      <div className="w-8 sm:w-12 flex justify-center items-center mr-2 sm:mr-4 shrink-0">
        {getRankMedal(entry.rank!)}
      </div>
      
      <div className="flex-shrink-0 mr-2.5 sm:mr-4">
        {entry.avatar_url ? (
          <img 
            src={entry.avatar_url} 
            alt={entry.full_name} 
            className={`rounded-full object-cover shadow-sm border-2 ${entry.rank! <= 3 ? 'w-10 h-10 sm:w-14 sm:h-14 border-amber-400' : 'w-8 h-8 sm:w-10 sm:h-10 border-transparent'}`}
          />
        ) : (
          <div className={`rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold shadow-sm border-2 ${entry.rank! <= 3 ? 'w-10 h-10 sm:w-14 sm:h-14 border-amber-400 text-sm sm:text-xl' : 'w-8 h-8 sm:w-10 sm:h-10 border-transparent text-xs sm:text-sm'}`}>
            {entry.full_name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className={`font-semibold truncate ${isCurrentUser ? 'text-brand-900 dark:text-brand-300' : 'text-gray-900 dark:text-gray-100'} ${entry.rank! <= 3 ? 'text-sm sm:text-lg' : 'text-xs sm:text-base'}`}>
          {entry.full_name}
          {isCurrentUser && <span className="ml-1.5 text-[9px] sm:text-[10px] uppercase tracking-wider bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 px-1.5 py-0.5 rounded-full font-bold">You</span>}
        </h4>
        <div className="flex items-center gap-2 sm:gap-3 mt-0.5 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 flex-wrap">
          <span title="Courses Completed">📚 {entry.courses_completed}</span>
          <span title="Lessons Completed">📝 {entry.lessons_completed}</span>
          <span title="Scripts Copied">🎙️ {entry.scripts_copied}</span>
        </div>
      </div>

      <div className="ml-2 sm:ml-4 flex-shrink-0 group relative cursor-help">
        <div className="bg-gray-900 text-white font-mono text-xs sm:text-sm px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-sm flex items-center gap-1 sm:gap-1.5 border border-gray-700">
          <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
          <span>{entry.score.toLocaleString()}</span>
        </div>
        {/* Tooltip — centered to avoid edge bleed on mobile */}
        <div className="absolute bottom-full right-0 sm:left-1/2 sm:-translate-x-1/2 mb-2 w-52 sm:w-56 bg-gray-900 text-white text-xs p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl border border-gray-700">
          <div className="font-semibold mb-1 text-gray-300">Score Breakdown</div>
          <div className="flex justify-between"><span>{entry.courses_completed} Courses × 300</span><span>{entry.courses_completed * 300}</span></div>
          <div className="flex justify-between"><span>{entry.lessons_completed} Lessons × 10</span><span>{entry.lessons_completed * 10}</span></div>
          <div className="flex justify-between"><span>{entry.scripts_copied} Scripts × 50</span><span>{entry.scripts_copied * 50}</span></div>
          <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between font-bold text-amber-400">
            <span>Total Score</span>
            <span>{entry.score.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-brand-900 rounded-t-2xl sm:rounded-t-3xl p-5 sm:p-8 text-center relative overflow-hidden shadow-lg">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center justify-center gap-2 sm:gap-3 relative z-10 drop-shadow-md">
          <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400" />
          Leaderboard
        </h2>
        <p className="text-brand-100 mt-1 sm:mt-2 relative z-10 font-medium text-xs sm:text-sm">Top performing sales professionals</p>
      </div>
      
      <div className="bg-gray-50 dark:bg-gray-900/50 p-3 sm:p-6 rounded-b-2xl sm:rounded-b-3xl shadow-md border border-t-0 border-gray-200 dark:border-gray-700">
        <div className="space-y-3">
          {top10.map(entry => (
            <Row key={entry.user_id} entry={entry} isCurrentUser={entry.user_id === currentUserId} />
          ))}
          
          {entries.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
              <Trophy className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>No leaderboard entries yet.</p>
            </div>
          )}
          
          {showCurrentUserAtBottom && (
            <>
              <div className="flex items-center justify-center py-2">
                <div className="w-1 h-1 bg-gray-300 rounded-full mx-1"></div>
                <div className="w-1 h-1 bg-gray-300 rounded-full mx-1"></div>
                <div className="w-1 h-1 bg-gray-300 rounded-full mx-1"></div>
              </div>
              <Row entry={currentUserEntry} isCurrentUser={true} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
