import { LegalDraft } from "@/components/legal/LegalDraft";
import { LEGAL_DOCUMENTS } from "@/lib/legal-documents";
export default function MarketingPage() { return <LegalDraft title={LEGAL_DOCUMENTS.marketing.title} sections={LEGAL_DOCUMENTS.marketing.sections} />; }
