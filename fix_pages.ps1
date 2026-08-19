$files = @(
    'app/dashboard/voice-notes/page.tsx',
    'app/dashboard/faqs/page.tsx',
    'app/dashboard/scripts/page.tsx',
    'app/dashboard/objections/page.tsx'
)

foreach ($f in $files) {
    $content = Get-Content $f -Raw
    $content = $content -replace 'const { data: ([a-z]+) } = await supabase(.*?)(\.order.*?\))', "$1Res = await supabase$2
  const { data: tools } = await supabase.from('tools').select('id, name').eq('status', 'published').order('name')"
    # This regex is a bit complex, let's just write a python script which is easier.
}
