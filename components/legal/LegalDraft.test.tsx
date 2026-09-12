import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPage from "@/app/legal/privacy/page";
import TermsPage from "@/app/legal/terms/page";
import MarketingPage from "@/app/legal/marketing/page";

describe("legal full pages", () => {
  it.each([[TermsPage, "Potata Terms of Service", "Pre-launch status"], [PrivacyPage, "Potata Privacy Notice", "Optional fit data"], [MarketingPage, "Optional marketing consent", "Withdrawal"]] as const)("renders versioned draft content and an onboarding back link", (Page, title, section) => {
    render(<Page />);
    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    expect(screen.getByText(/DRAFT · NOT FOR PRODUCTION/)).toBeTruthy();
    expect(screen.getByText(new RegExp(section))).toBeTruthy();
    expect(screen.getByRole("link", { name: "Return to onboarding" }).getAttribute("href")).toBe("/onboarding/profile");
  });
});
