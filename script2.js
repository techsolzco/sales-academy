const fs = require('fs');
const path = require('path');

const actionsDir = path.join('c:/Users/DELL/Documents/antigravity/happy-bose', 'lib/actions');

// Fix quizzes
let qz = fs.readFileSync(path.join(actionsDir, 'quizzes.ts'), 'utf8');
const deleteQuizRegex = /\.from\('quizzes'\)\.delete\(\)\.eq\('id', id\)/;
qz = qz.replace(deleteQuizRegex, ".from('quizzes').update({ deleted_at: new Date().toISOString() }).eq('id', id)");
const bulkFunc = \\\nexport async function bulkSoftDeleteQuizzes(ids: string[]): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('quizzes').update({ deleted_at: new Date().toISOString() }).in('id', ids)
    if (error) return { error: error.message }
    revalidatePath('/admin/quizzes')
    return { data: undefined }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}\\n\;
qz += bulkFunc;
fs.writeFileSync(path.join(actionsDir, 'quizzes.ts'), qz);

// Now we need to add .is('deleted_at', null) to fetches

function addFilter(file, table) {
    let content = fs.readFileSync(path.join(actionsDir, file), 'utf8');
    // Find fetches like .from('table').select(...)
    const regex = new RegExp(\\\\\.from\\\\('\'\\\\)\\\\.select\\\\('\[^'\]+'\\\\)\, 'g');
    content = content.replace(regex, match => match + \.is('deleted_at', null)\);
    const regex2 = new RegExp(\\\\\.from\\\\('\'\\\\)\\\\.select\\\\("\\[^"\\]+"\\\\)\, 'g');
    content = content.replace(regex2, match => match + \.is('deleted_at', null)\);
    const regex3 = new RegExp(\\\\\.from\\\\('\'\\\\)\\\\.select\\\\(\\\\[^\\\\]+\\\\)\, 'g');
    content = content.replace(regex3, match => match + \.is('deleted_at', null)\);
    fs.writeFileSync(path.join(actionsDir, file), content);
}

// this is a bit risky. Let's just do it carefully.
