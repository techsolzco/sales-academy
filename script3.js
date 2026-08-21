const fs = require('fs');
const path = require('path');

const target = 'c:/Users/DELL/Documents/antigravity/happy-bose/components/admin/FAQManager.tsx';
let c = fs.readFileSync(target, 'utf8');

c = c.replace("import { deleteFAQ } from '@/lib/actions/faqs'", "import { deleteFAQ, bulkSoftDeleteFAQs } from '@/lib/actions/faqs'\nimport { Loader2 } from 'lucide-react'");
c = c.replace("const [faqs, setFaqs] = useState(initialFaqs)", "const [faqs, setFaqs] = useState(initialFaqs)\n  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())\n  const [isBulkDeleting, setIsBulkDeleting] = useState(false)");
c = c.replace("function handleDelete(id: string) {", sync function handleBulkDelete() {
    if(!confirm(\Delete \ FAQs?\)) return;
    setIsBulkDeleting(true);
    const res = await bulkSoftDeleteFAQs(Array.from(selectedIds));
    setIsBulkDeleting(false);
    if (!res.error) {
      setFaqs(prev => prev.filter(f => !selectedIds.has(f.id)));
      setSelectedIds(new Set());
    }
  }

  function handleDelete(id: string) {);

// Add checkbox to renderFaqCard
c = c.replace("<div className=\"flex items-start justify-between gap-4\">", <div className="flex items-start justify-between gap-4">
              <input type="checkbox" checked={selectedIds.has(faq.id)} onChange={e => {
                setSelectedIds(prev => { const next = new Set(prev); e.target.checked ? next.add(faq.id) : next.delete(faq.id); return next; })
              }} className="w-4 h-4 rounded border-gray-300 mt-1 mr-2" />);

// Add bottom bar
c = c.replace("{/* Action Header */}", {selectedIds.size > 0 && (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-4">
    <span className="text-sm font-medium text-gray-700">{selectedIds.size} selected</span>
    <button onClick={handleBulkDelete} disabled={isBulkDeleting} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50">
      {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      Delete {selectedIds.size} selected
    </button>
    <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
  </div>
)}
      {/* Action Header */});

fs.writeFileSync(target, c);
