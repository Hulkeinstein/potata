import { LegalDraft } from "@/components/legal/LegalDraft";
import { LEGAL_DOCUMENTS } from "@/lib/legal-documents";
export default function TermsPage() { return <LegalDraft title={LEGAL_DOCUMENTS.terms.title} sections={LEGAL_DOCUMENTS.terms.sections} />; }
