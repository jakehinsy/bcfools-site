import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "../LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Brew City FOOLS collects, uses, and protects information submitted through its public website.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Your information"
      title="Privacy Policy"
      intro="This policy explains what the Brew City chapter collects through its public website, why it is used, and the choices available to applicants and visitors."
    >
      <section>
        <h2>Information we collect</h2>
        <p>
          When you submit a membership application, we may collect your name,
          email address, phone number, fire department, state, rank, fire-service
          status, previous chapter, FOOLS ID number, application type, and the
          attestations or communication choices shown on the form.
        </p>
        <p>
          The site may also receive limited technical information needed to
          operate and protect the form, such as submission time, request
          identifiers, browser information, and security or abuse-prevention
          signals.
        </p>
      </section>

      <section>
        <h2>How we use information</h2>
        <p>We use submitted information to:</p>
        <ul>
          <li>review new and renewal membership applications;</li>
          <li>contact applicants about their application or chapter status;</li>
          <li>
            create or connect a Platoon account after email verification when
            that account-activation option is available;
          </li>
          <li>maintain chapter membership and dues records;</li>
          <li>send optional text updates when separate consent is provided; and</li>
          <li>secure, troubleshoot, and improve the application process.</li>
        </ul>
        <p>
          When account activation is available, creating a Platoon account does
          not by itself approve a Brew City membership application or confirm
          payment or good standing.
        </p>
      </section>

      <section>
        <h2>Text messaging privacy</h2>
        <p>
          Text-message consent is optional and is not a condition of membership.
          Mobile information and messaging consent will not be sold, rented, or
          shared with third parties or affiliates for their marketing or
          promotional purposes.
        </p>
        <p>
          We may use service providers acting on our behalf to deliver messages,
          operate the membership system, prevent abuse, or comply with law. They
          may use the information only to provide those services or meet legal
          obligations. See the <Link href="/terms">Terms of Use</Link> for
          messaging frequency, rates, and opt-out instructions.
        </p>
      </section>

      <section>
        <h2>When information is shared</h2>
        <p>
          Information may be available to authorized Brew City officers who
          review applications or administer membership. Platoon and other
          contracted providers may process information only as needed to host,
          secure, communicate, or operate the approved workflow. Payment details
          are handled by the payment provider and are not stored by this public
          website.
        </p>
        <p>
          We may also disclose information when required by law, to protect the
          chapter or others, or as part of an organizational transition where
          appropriate privacy protections remain in place.
        </p>
      </section>

      <section>
        <h2>Retention and security</h2>
        <p>
          We keep information only as long as reasonably needed for membership,
          recordkeeping, dispute resolution, security, and legal obligations.
          We use reasonable administrative and technical safeguards, but no
          internet transmission or storage system can be guaranteed completely
          secure.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <p>
          You may decline optional text messages and still submit an application.
          If you opt in, reply STOP to unsubscribe or HELP for help. You may also
          contact the chapter to ask about access, correction, or deletion of
          information, subject to records the chapter must retain.
        </p>
      </section>

      <section>
        <h2>Other websites and updates</h2>
        <p>
          Links to Platoon, Square, FOOLS International, social networks, and
          other services are governed by their own privacy practices. We may
          update this policy as the website or membership workflow changes. The
          effective date above identifies the current version.
        </p>
      </section>
    </LegalPage>
  );
}
