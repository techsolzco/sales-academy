const fs = require('fs');
const path = require('path');

const actionsDir = path.join('c:/Users/DELL/Documents/antigravity/happy-bose', 'lib/actions');

function softDeleteReplacer(file, entityName, idParam, bulkFuncName, extraReval = '') {
    const fullPath = path.join(actionsDir, file);
    if (!fs.existsSync(fullPath)) return;
    let content = fs.readFileSync(fullPath, 'utf8');

    // Replace delete with update for soft-delete
    const deleteRegex = new RegExp(\\\\\.delete\\\\(\\\\)\\\\.eq\\\\('id',\\\\s*\\\\\)\);
    content = content.replace(deleteRegex, \.update({ deleted_at: new Date().toISOString() }).eq('id', \)\);

    // Add bulk delete function
    if (!content.includes(bulkFuncName)) {
        const bulkFunc = \\\nexport async function \(ids: string[]): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('\').update({ deleted_at: new Date().toISOString() }).in('id', ids)
    if (error) return { error: error.message }
    revalidatePath('/admin/\')
    \
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}\\n\;
        content += bulkFunc;
    }
    fs.writeFileSync(fullPath, content);
}

softDeleteReplacer('courses.ts', 'courses', 'id', 'bulkSoftDeleteCourses');
softDeleteReplacer('modules.ts', 'modules', 'moduleId', 'bulkSoftDeleteModules');
softDeleteReplacer('faqs.ts', 'faqs', 'id', 'bulkSoftDeleteFAQs', "revalidatePath('/dashboard/faqs');");
softDeleteReplacer('scripts.ts', 'scripts', 'id', 'bulkSoftDeleteScripts');
softDeleteReplacer('objections.ts', 'objections', 'id', 'bulkSoftDeleteObjections');
softDeleteReplacer('voice-notes.ts', 'voice_notes', 'id', 'bulkSoftDeleteVoiceNotes');
softDeleteReplacer('assignments.ts', 'assignments', 'id', 'bulkSoftDeleteAssignments');
softDeleteReplacer('quizzes.ts', 'quizzes', 'id', 'bulkSoftDeleteQuizzes');
softDeleteReplacer('tools.ts', 'tools', 'id', 'bulkSoftDeleteTools');
softDeleteReplacer('lessons.ts', 'lessons', 'lessonId', 'bulkSoftDeleteLessons');

console.log('Done replacements');
