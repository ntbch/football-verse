import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/shared/components/legal-page";

export const metadata: Metadata = { title: "Terms of Service | Football Verse" };

export default function TermsPage() {
  return <LegalPage eyebrow="Legal" title="Terms of Service" updated="4 August 2026">
    <p>These terms govern use of Football Verse, including its football stories, community features, predictions, and daily games. By creating an account or using an account-only feature, you agree to follow them.</p>
    <LegalSection title="Service and content"><p>Football Verse provides editorial football metadata, source links, community tools, predictions, and games for information and entertainment. Sports data can be delayed, incomplete, or corrected. We do not guarantee match outcomes, transfer outcomes, availability, or accuracy of third-party sources.</p></LegalSection>
    <LegalSection title="Accounts"><p>Keep account credentials private and provide accurate registration information. You are responsible for activity performed through your account. We may suspend access when necessary to protect users, sources, or the service.</p></LegalSection>
    <LegalSection title="Community content"><p>You retain responsibility for content you submit. You grant Football Verse permission to store, display, moderate, and technically process that content to operate the service. Do not submit unlawful, threatening, abusive, deceptive, private, infringing, or malicious material.</p></LegalSection>
    <LegalSection title="Predictions and games"><p>Predictions and games have no cash value and create no promise of reward unless a separate written promotion says otherwise. Do not automate play, manipulate rankings, or exploit defects.</p></LegalSection>
    <LegalSection title="Changes and contact"><p>We may change these terms when the service changes. Material changes will be posted on this page. Questions or removal requests can be sent through the <a href="/contact">Contact</a> page.</p></LegalSection>
  </LegalPage>;
}
