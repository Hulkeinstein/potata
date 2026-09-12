import { LEGAL_VERSION } from "@/lib/onboarding";

export const LEGAL_DOCUMENTS = {
  terms: {
    title: "Potata Terms of Service",
    sections: ["1. Eligibility — the public-signup age rule and guardian-consent process remain closed until UAE counsel approval.", "2. Accounts — provide accurate information, keep credentials secure, and do not impersonate another person.", "3. Acceptable use — do not abuse, disrupt, scrape unlawfully, or use Potata to violate another person's rights.", "4. User content — you retain ownership and grant Potata the limited licence needed to display and moderate content you submit.", "5. Moderation — Potata may remove unlawful or policy-violating content and may suspend accounts to protect users and the service.", "6. Intellectual property — Potata branding, software and curated content remain protected by their respective owners.", "7. Pre-launch status — Potata currently does not process real payments or conclude retail sales. Shipping, returns, refunds, warranty, tax and invoice terms must be approved before commerce opens.", "8. Governing terms and contact — final UAE jurisdiction, entity, licence, address and support channel require owner and counsel approval."],
    href: "/legal/terms",
  },
  privacy: {
    title: "Potata Privacy Notice",
    sections: ["1. Controller — Potata's final UAE legal entity, licensed address and privacy contact are pending owner and counsel approval.", "2. Data categories — account email/provider identity, display name, handle, optional avatar and preferences, service activity, and security records.", "3. Optional fit data — height in centimetres and weight in kilograms are collected only when you enter them, solely for AI style and fit recommendations. They are not used for marketing.", "4. Purposes — authentication, profile and social features, requested recommendations, customer support, security, and proof of consent.", "5. Recipients and transfers — Google, Supabase, Vercel and Resend may act as processors when configured. Hosting countries and transfer safeguards require final disclosure before launch.", "6. Retention — account and consent evidence are retained only for the approved service and legal periods. Optional height and weight remain until you clear them in Settings or delete the account; the final schedule requires approval.", "7. Your rights — request access, correction, restriction, portability or deletion, object to processing, and withdraw optional consent as easily as it was given.", "8. Security and complaints — access controls and least-privilege processing apply. Final complaint channel and UAE regulator route will be published after counsel review."],
    href: "/legal/privacy",
  },
  marketing: {
    title: "Optional marketing consent",
    sections: ["1. Choice — marketing email consent is optional, separate from Terms and Privacy, and off by default.", "2. Purpose — when activated in a future approved release, it may cover Potata product, style and benefit news by email.", "3. No effect on service — refusing or withdrawing does not affect membership or core features.", "4. Withdrawal — change the preference in Settings or use the withdrawal method included in any future message.", "5. Current status — no marketing automation is enabled in this pre-launch build; this record stores the user's choice only."],
    href: "/legal/marketing",
  },
} as const;

export const LEGAL_DRAFT_NOTICE = "DRAFT · NOT FOR PRODUCTION · UAE-qualified counsel approval required";
export const LEGAL_PENDING_NOTICE = "Arabic authoritative wording, legal entity, licence, address, controller contact and complaint channel are pending owner/counsel input.";

export type LegalDocumentKey = keyof typeof LEGAL_DOCUMENTS;
export { LEGAL_VERSION };
