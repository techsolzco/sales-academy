import re

def fix_page(path, var_name, comp_name):
    with open(path, 'r') as f:
        c = f.read()
    
    if "tools" in c and "from('tools')" in c: return
    
    # replace fetch
    c = re.sub(
        rf"const {{ data: {var_name} }} = await supabase\s*\n\s*\.from\('{var_name}'\)(.*?)\n",
        f"const [ {var_name}Res, toolsRes ] = await Promise.all([\n    supabase.from('{var_name}')\\1,\n    supabase.from('tools').select('id, name').eq('status', 'published').order('name')\n  ])\n  const {var_name} = {var_name}Res.data\n  const tools = toolsRes.data\n",
        c,
        flags=re.DOTALL
    )
    # wait the from table name might not match var_name (voice_notes -> notes).
    pass

