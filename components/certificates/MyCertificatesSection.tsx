import { fetchMyCertificates } from '@/lib/actions/certificates'
import { MyCertificates } from '@/components/certificates/MyCertificates'

// Server wrapper: fetches the effective user's certificates and renders
// the client list. Render this on the staff dashboard (see wiring snippet
// in the implementation report — app/dashboard/page.tsx is not edited here).
export async function MyCertificatesSection() {
  const { data: certificates } = await fetchMyCertificates()
  return <MyCertificates certificates={certificates ?? []} />
}
