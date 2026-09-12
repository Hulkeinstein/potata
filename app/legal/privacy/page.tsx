import { LegalDraft } from "@/components/legal/LegalDraft";
import { LEGAL_DOCUMENTS } from "@/lib/legal-documents";
export default function PrivacyPage() { return <LegalDraft title={LEGAL_DOCUMENTS.privacy.title} sections={LEGAL_DOCUMENTS.privacy.sections} />; }
