# Phase 16: Tool Grouping, Gated Completion, Translations & Bug Fixes

## 1. Tool-Based Categorization (Group by Tool)
- **Goal:** Replace flat lists with grouped sections across 8 pages (4 admin, 4 salesman).
- **Implementation:**
  - Create a reusable UI component `<GroupedList />` or implement grouping logic inline where it maps data by `tool_id`.
  - For each page (`/admin/voice-notes`, `/admin/faqs`, `/admin/scripts`, `/admin/objections` and their dashboard equivalents):
    - Group items by `tool.name`. Items with no `tool_id` go to "Uncategorized".
    - Render collapsible sections (e.g., using `details`/`summary` or a custom stateful Accordion) sorted alphabetically.

## 2. Course Completion Gated by KB Reviews
- **Goal:** Course progress must factor in required FAQs, Scripts, Voice Notes, and Objections linked to the course's tool.
- **Implementation:**
  - Update `app/dashboard/training/[courseId]/page.tsx` (and `app/dashboard/training/page.tsx`).
  - Fetch related KB items (FAQs, Objections, Voice Notes, Scripts) where `course_id === currentCourseId`.
  - Fetch user's `kb_reviews` for these items.
  - Render a "Required Reading" section in the course view with "Mark as Reviewed" buttons.
  - Update progress calculation: `Total Required = Lessons + KB Items`. `Completed = Completed Lessons + Reviewed KB Items`.
  - Ensure Course isn't marked 100% unless all KB items are reviewed.

## 3. Per-Item Language Toggle (Gemini Translation)
- **Goal:** Add a button to translate KB items between Urdu script and English/Hinglish on the fly, saving to the DB.
- **Implementation:**
  - **Database Changes:** Add `content_translated` (or equivalent fields like `question_translated`, `answer_translated`) to `faqs`, `objections`, `scripts`, `voice_notes` via a new SQL migration.
  - **UI Changes:** Add a "🌐 Translate" button to `SalesmanFAQViewer`, `SalesmanScriptViewer`, etc.
  - **Server Action:** Create `translateContent(table, id, targetLanguage)` which calls Gemini to translate text, then updates the `_translated` column.
  - **Caching:** The UI will toggle between original and `_translated` without re-calling the API if the translation already exists.

## 4. Edit Modal Pre-fill Fix
- **Goal:** Modals open blank instead of showing existing data.
- **Implementation:**
  - `ToolFormModal` was fixed by adding `useEffect` listening to `[tool?.id, isOpen]`.
  - Replicate this `useEffect` fix across `VoiceNoteFormModal.tsx`, `FAQFormModal.tsx`, `ScriptFormModal.tsx`, `ObjectionFormModal.tsx`.
  - Ensure `reset(existingData)` is properly called when the modal opens.

## 5. False "Email already exists" Error on Approval
- **Goal:** Fix the bug where new emails fail with "email already exists" on `approveApplication`.
- **Implementation:**
  - Investigate `approveApplication` in `lib/actions/enrollment.ts`.
  - The bug is likely due to how Supabase Auth handles `createUser`. If an orphaned user exists in `auth.users` (e.g. from a failed profile creation earlier), we should gracefully handle `authErr`.
  - We can check if the error is "User already exists", then try to fetch the user ID via `admin.listUsers()` or just assume they exist and upsert their profile. Alternatively, verify if the test scripts left duplicate emails.

## User Review Required
Please review the plan. Let me know if you approve or if you'd like any adjustments before I begin execution!
