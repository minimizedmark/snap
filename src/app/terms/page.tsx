export const metadata = {
  title: 'Terms of Service | Snap Calls',
  description: 'Snap Calls Terms of Service',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-light-grey flex flex-col">
      {/* Header */}
      <header className="bg-deep-black border-b-4 border-safety-orange">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <a href="/" className="text-white font-bold text-xl uppercase tracking-widest hover:text-safety-orange transition-colors">
            Snap Calls
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <h1 className="text-3xl font-bold text-deep-black uppercase tracking-wide mb-1">Terms of Service</h1>
        <p className="text-sm text-gray-500 font-medium mb-10">Effective date: February 5, 2026</p>

        <div className="bg-white border-4 border-safety-orange rounded-xl p-8 space-y-8" style={{ boxShadow: '0 4px 20px rgba(255, 107, 0, 0.15)' }}>
          <p className="text-charcoal-text font-medium">
            These Terms of Service ("Terms") govern your access to and use of Snap Calls (the "Service"). By accessing or using
            the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
          </p>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">1. The Service</h2>
            <p className="text-charcoal-text font-medium">
              Snap Calls provides call handling and automated customer communication tools. We may update or change the Service
              at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">2. Eligibility</h2>
            <p className="text-charcoal-text font-medium">
              You must be at least 18 years old and able to form a binding contract to use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">3. Accounts and Security</h2>
            <p className="text-charcoal-text font-medium">
              You are responsible for maintaining the confidentiality of your account credentials and for all activity under
              your account. Notify us immediately of any unauthorized use.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">4. Acceptable Use</h2>
            <p className="text-charcoal-text font-medium">
              You agree not to misuse the Service or use it for unlawful, harmful, or abusive activity, including spam, fraud,
              or harassment.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">5. Payments and Billing</h2>
            <p className="text-charcoal-text font-medium">
              Paid features may require fees and taxes. Payments are non-refundable except as required by law or explicitly
              stated. You authorize us to charge your payment method for applicable fees.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">6. Phone Numbers</h2>
            <p className="text-charcoal-text font-medium">
              Phone numbers provisioned through the Service are owned by Snap Calls and may be reassigned if your account is
              paused, terminated, or inactive, or if your wallet balance remains at $0 for 45 consecutive days. After 45 days of an empty wallet, the account is considered closed and the assigned number is returned to the reassignment pool.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">7. Third-Party Services</h2>
            <p className="text-charcoal-text font-medium">
              The Service may integrate with third-party providers (e.g., telephony and payment processors). Your use of those
              services is subject to their terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">8. Data and Privacy</h2>
            <p className="text-charcoal-text font-medium">
              Our Privacy Policy explains how we collect and use information. By using the Service, you agree to our data
              practices.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">9. Termination</h2>
            <p className="text-charcoal-text font-medium">
              You may stop using the Service at any time. We may suspend or terminate access if you violate these Terms or if
              required to protect the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">10. Disclaimers</h2>
            <p className="text-charcoal-text font-medium">
              The Service is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free
              operation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">11. Limitation of Liability</h2>
            <p className="text-charcoal-text font-medium">
              To the maximum extent permitted by law, Snap Calls will not be liable for indirect, incidental, or consequential
              damages, or loss of profits, data, or goodwill.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">12. Changes to Terms</h2>
            <p className="text-charcoal-text font-medium">
              We may update these Terms from time to time. Continued use of the Service after changes become effective
              constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">13. Contact</h2>
            <p className="text-charcoal-text font-medium">
              For questions, contact us at{' '}
              <a href="mailto:support@snappcalls.app" className="text-safety-orange font-bold hover:underline">
                support@snappcalls.app
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-safety-orange mt-12 bg-deep-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-white">
            <p className="font-bold uppercase tracking-wider">&copy; {new Date().getFullYear()} Snap Calls. Never miss another customer.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
