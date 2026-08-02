import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "../LegalPage";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Terms for using the Brew City FOOLS public website, membership application, and optional messaging program.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Website and messaging"
      title="Terms of Use"
      intro="These terms cover use of the Brew City chapter website, its membership application, and the optional text-message program."
    >
      <section>
        <h2>Website use</h2>
        <p>
          You may use this site for lawful personal and chapter-related purposes.
          Do not interfere with the site, attempt unauthorized access, submit
          false information, or use its content or forms to harm others.
        </p>
      </section>

      <section>
        <h2>Membership applications</h2>
        <p>
          Submitting an application or creating a Platoon account does not
          guarantee chapter membership. Brew City FOOLS reviews applications
          separately. Account status, application approval, payment, and good
          standing are separate records and may change at different times.
        </p>
        <p>
          You are responsible for providing accurate information and keeping
          account credentials secure. When Platoon account matching is offered,
          verified email is used for automatic matching; the chapter does not
          automatically merge accounts by name.
        </p>
      </section>

      <section>
        <h2>Optional text messages</h2>
        <p>
          If you separately opt in, Brew City FOOLS may send occasional text
          messages about time-sensitive chapter, membership, training, and event
          updates. Message frequency varies. Message and data rates may apply.
          Consent is optional and is not a condition of membership or purchase.
        </p>
        <p>
          Reply STOP to unsubscribe or HELP for help. Carriers are not liable for
          delayed or undelivered messages. You are responsible for providing a
          mobile number you control and for updating the chapter if that number
          changes. See our <Link href="/privacy">Privacy Policy</Link> for how
          mobile information and consent records are handled.
        </p>
      </section>

      <section>
        <h2>Payments</h2>
        <p>
          Membership prices and payment timing are shown during the application
          process. Payments are handled through the identified payment provider.
          No recurring subscription is created unless a future checkout clearly
          presents recurring terms and you expressly authorize them.
        </p>
      </section>

      <section>
        <h2>Content and external services</h2>
        <p>
          Chapter information may change, and the site may contain links to
          Platoon, Square, FOOLS International, social networks, or other
          services. Those services operate under their own terms and policies.
          Brew City names, logos, photographs, and original site content may not
          be reused in a way that implies chapter endorsement without permission.
        </p>
      </section>

      <section>
        <h2>Availability and responsibility</h2>
        <p>
          The site is provided on an as-available basis. We work to keep
          information accurate and the service reliable, but cannot promise that
          every feature will always be uninterrupted or error-free. Nothing on
          this public site replaces official fire-department policy, training,
          command, or emergency communications.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We may update these terms as the site or membership workflow changes.
          The effective date above identifies the current version. Continued use
          after an update means the revised terms apply to later activity.
        </p>
      </section>
    </LegalPage>
  );
}
