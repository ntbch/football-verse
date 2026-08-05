import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/shared/components/legal-page";

export const metadata: Metadata = { title: "Community Guidelines | Football Verse" };

export default function CommunityGuidelinesPage() {
  return <LegalPage eyebrow="Community" title="Community Guidelines" updated="4 August 2026">
    <p>Football Verse discussions should make football easier to follow, not harder to enjoy. These guidelines apply to threads, replies, reports, profiles, and any other user-submitted content.</p>
    <LegalSection title="Do"><ul><li>Disagree with ideas and predictions respectfully.</li><li>Use evidence and identify uncertainty when discussing news.</li><li>Report harassment, spam, impersonation, and unsafe content.</li><li>Keep discussion relevant to the story, fixture, or category.</li></ul></LegalSection>
    <LegalSection title="Do not"><ul><li>Harass, threaten, target, or discriminate against people.</li><li>Post private information, malicious links, scams, or unsolicited advertising.</li><li>Impersonate a player, club, journalist, moderator, or Football Verse.</li><li>Manipulate votes, predictions, rankings, or daily games.</li></ul></LegalSection>
    <LegalSection title="Moderation"><p>Moderators may hide content, lock threads, resolve reports, issue warnings, or restrict accounts. Actions consider context, severity, repetition, and safety. False reports and attempts to evade moderation may also result in restrictions.</p></LegalSection>
    <LegalSection title="Report a problem"><p>Use the in-product report controls and include enough context for review. Urgent safety concerns should also be sent through the <a href="/contact">Contact</a> page.</p></LegalSection>
  </LegalPage>;
}
