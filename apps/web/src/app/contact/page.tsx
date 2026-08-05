import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/shared/components/legal-page";

export const metadata: Metadata = { title: "Contact | Football Verse" };

export default function ContactPage() {
  return <LegalPage eyebrow="Support" title="Contact Football Verse" updated="4 August 2026">
    <p>Use the address below for account, privacy, source correction, copyright, or community safety requests. Include the relevant URL and enough detail for us to investigate.</p>
    <LegalSection title="Support and legal requests"><p><a href="mailto:admin@footballverse.com">admin@footballverse.com</a></p></LegalSection>
    <LegalSection title="Source corrections"><p>Football Verse aggregates attributed football metadata. We can review incorrect attribution, outdated status, broken source links, or a correction request. We do not remove a source merely because its conclusion is inconvenient; explain the factual issue and provide evidence where possible.</p></LegalSection>
    <LegalSection title="Account requests"><p>For export or deletion requests, contact us from the account email where possible. We may ask for verification before changing or disclosing account data.</p></LegalSection>
  </LegalPage>;
}
