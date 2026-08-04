import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/shared/components/legal-page";

export const metadata: Metadata = { title: "Privacy Policy | Football Verse" };

export default function PrivacyPage() {
  return <LegalPage eyebrow="Legal" title="Privacy Policy" updated="4 August 2026">
    <p>This policy explains what Football Verse stores, why it is used, and the choices available to account holders.</p>
    <LegalSection title="Information we receive"><p>We may store registration details, profile information, authentication and session records, followed entities, bookmarks, predictions, game attempts, reports, and community content. We also receive technical logs needed to secure and operate the service.</p></LegalSection>
    <LegalSection title="How we use it"><p>We use information to authenticate users, personalize feeds, calculate predictions and game rankings, deliver notifications, moderate community content, prevent abuse, troubleshoot failures, and improve reliability.</p></LegalSection>
    <LegalSection title="Sources and sharing"><p>Football metadata is collected from attributed third-party sources and is not a user profile. We do not sell personal information. Limited service providers may process data for hosting, email, authentication, monitoring, or delivery, subject to their own terms.</p></LegalSection>
    <LegalSection title="Retention and choices"><p>We retain information only as needed for the purposes above, security, dispute handling, and legal obligations. You may request access, correction, export, or deletion where applicable. Deleting an account may not remove anonymized or legally required records.</p></LegalSection>
    <LegalSection title="Contact"><p>For privacy questions or requests, use the <a href="/contact">Contact</a> page. We may verify account ownership before fulfilling a request.</p></LegalSection>
  </LegalPage>;
}
