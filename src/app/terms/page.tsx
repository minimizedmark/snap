export const metadata = {
  title: 'Terms of Service | Snap Calls',
  description: 'Snap Calls Terms of Service',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-light-grey flex flex-col">
      <header className="bg-deep-black border-b-4 border-safety-orange">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <a href="/" className="text-white font-bold text-xl uppercase tracking-widest hover:text-safety-orange transition-colors">
            Snap Calls
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <h1 className="text-3xl font-bold text-deep-black uppercase tracking-wide mb-1">Terms of Service</h1>
        <p className="text-sm text-gray-500 font-medium mb-10">Last Updated: February 18, 2026</p>

        <div className="bg-white border-4 border-safety-orange rounded-xl p-8 space-y-8" style={{ boxShadow: '0 4px 20px rgba(255, 107, 0, 0.15)' }}>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">1. Introduction &amp; Scope</h2>
            <p className="text-charcoal-text font-medium">
              These terms govern your use of SnapCalls AI-powered missed call response services. Automation Overlord Inc. operates the entity known as SnapCalls and Snapline and provides phone number assignment, custom greeting playback, and automated SMS response services to business customers (&ldquo;Customer&rdquo;).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">2. Service Description &amp; Usage</h2>
            <div className="space-y-3 text-charcoal-text font-medium">
              <p><span className="font-bold">Service Overview:</span> SnapCalls provides phone numbers that play custom greetings and generate AI-powered SMS responses to missed calls. Customers forward their existing business number to their assigned SnapCalls number. Snapline is a VoIP phone service providing local phone services.</p>
              <p><span className="font-bold">Pricing:</span> Standard rate is $0.99 per AI response. Lower rates available with larger wallet deposits as displayed at time of purchase. Snapline subscription is $20.00 per month.</p>
              <p><span className="font-bold">Lawful Use:</span> Service must be used for legitimate business communications only. Prohibited uses include spam, adult content, harassment, fraud, or any illegal activities.</p>
              <p><span className="font-bold">Authorized Users:</span> Only Customer and authorized employees may use the service.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">3. Phone Number Ownership &amp; Portability</h2>
            <ul className="list-disc list-inside space-y-2 text-charcoal-text font-medium">
              <li>All phone numbers provided remain the exclusive property of SnapCalls.</li>
              <li>Numbers are licensed for service use only — no ownership rights transfer.</li>
              <li>Numbers may be reclaimed for non-payment, terms violations, or business reasons.</li>
              <li>Customer may not transfer, sell, or assign numbers to third parties.</li>
              <li>Number portability subject to carrier restrictions and applicable regulations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">4. Billing &amp; Payment Terms</h2>
            <div className="space-y-3 text-charcoal-text font-medium">
              <p><span className="font-bold">Prepaid Wallet System:</span> Service requires prepaid wallet balance. Usage charges deducted automatically at published rates.</p>
              <p><span className="font-bold">Payment Terms:</span> Wallet deposits due immediately. Deposit bonuses applied as displayed at purchase.</p>
              <p><span className="font-bold">Non-Refundable:</span> Wallet credits are non-refundable.</p>
              <p><span className="font-bold">Late Fees:</span> Past due amounts subject to a 2.0% monthly service charge.</p>
              <p><span className="font-bold">Taxes:</span> Customer responsible for all applicable taxes and regulatory fees.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">5. Account Status &amp; Number Reassignment</h2>
            <div className="space-y-3 text-charcoal-text font-medium">
              <p><span className="font-bold">Active Account Requirements:</span> Accounts must maintain a positive wallet balance for continued service.</p>
              <p><span className="font-bold">Inactive Accounts:</span> If wallet balance remains $0.00 for 45 consecutive days, account becomes inactive and service terminates.</p>
              <p><span className="font-bold">Number Reassignment:</span> Phone numbers from inactive accounts may be immediately reassigned to new customers. No refunds or compensation for lost numbers due to account inactivity.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">6. Equipment &amp; Technical Requirements</h2>
            <div className="space-y-3 text-charcoal-text font-medium">
              <p><span className="font-bold">Customer Premise Equipment:</span> Customer responsible for compatible phone system and internet connectivity.</p>
              <p><span className="font-bold">Provider Equipment:</span> SnapCalls maintains all server infrastructure and AI systems.</p>
              <p><span className="font-bold">Access:</span> Customer must provide reasonable access for technical support when requested.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">7. Service Levels &amp; Support</h2>
            <div className="space-y-3 text-charcoal-text font-medium">
              <p><span className="font-bold">Uptime Target:</span> 99.5% uptime goal for voice services (not guaranteed).</p>
              <p><span className="font-bold">Response Time:</span> AI responses typically generated within 5 minutes of a missed call.</p>
              <p><span className="font-bold">Support Hours:</span> Technical support available during normal business hours.</p>
              <p><span className="font-bold">Maintenance:</span> Scheduled maintenance with advance notice when possible.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">8. Termination &amp; Suspension</h2>
            <div className="space-y-3 text-charcoal-text font-medium">
              <p><span className="font-bold">Termination by Customer:</span> 30 days written notice required. No refunds for unused wallet credits.</p>
              <p><span className="font-bold">Termination by Provider:</span> Immediate termination permitted for non-payment, terms violations, or unlawful use.</p>
              <p><span className="font-bold">Effect of Termination:</span> All phone numbers revert to SnapCalls. Customer data deleted within 90 days.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">9. Liability &amp; Indemnification</h2>
            <div className="space-y-3 text-charcoal-text font-medium">
              <p className="font-bold uppercase">Limitation of Liability: Provider not liable for special, indirect, or consequential damages including lost business opportunities.</p>
              <p><span className="font-bold">Service Disclaimer:</span> AI responses are automated and may contain errors. No guarantee of message delivery or accuracy.</p>
              <p><span className="font-bold">Customer Indemnification:</span> Customer indemnifies SnapCalls against claims arising from Customer&apos;s use of the service.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">10. Force Majeure</h2>
            <p className="text-charcoal-text font-medium">
              Neither party is liable for delays due to circumstances beyond reasonable control, including natural disasters, government actions, or network outages.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">11. Changes to Terms</h2>
            <p className="text-charcoal-text font-medium">
              SnapCalls may modify these terms at any time with 30 days&apos; notice. Continued use constitutes acceptance. Material changes require email notification.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">12. Governing Law &amp; Disputes</h2>
            <p className="text-charcoal-text font-medium">
              These terms are governed by the laws of Alberta. Disputes resolved through binding arbitration in Canada.
            </p>
          </section>

          <section className="border-t-2 border-gray-100 pt-6">
            <h2 className="text-lg font-bold text-deep-black uppercase tracking-wide mb-2">Contact</h2>
            <div className="text-charcoal-text font-medium space-y-1">
              <p>Automation Overlord Inc.</p>
              <p>
                <a href="mailto:mark@smartbizai.store" className="text-safety-orange font-bold hover:underline">
                  mark@smartbizai.store
                </a>
              </p>
              <p>+1 (780) 964-6752</p>
            </div>
          </section>

        </div>
      </main>

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
