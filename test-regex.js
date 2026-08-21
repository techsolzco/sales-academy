const str = "supabase.from('assignments').select('*, course:courses(title), lesson:lessons(title)').order('created_at')";
const regex = /\.from\(['"](courses|modules|lessons|faqs|scripts|objections|voice_notes|assignments|quizzes|tools)['"]\)\s*\.select\((['"`].*?['"`])\)/g;
console.log(str.replace(regex, (match) => match + `.is('deleted_at', null)`));
