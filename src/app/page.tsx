import Link from 'next/link';
import { Phone, Zap, DollarSign, MessageSquare, Users, TrendingUp } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <header className="border-b-4 border-safety-orange bg-deep-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-safety-orange rounded flex items-center justify-center border-2 border-white" style={{boxShadow: '0 0 10px rgba(255, 255, 255, 0.3)'}}>
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white uppercase tracking-wide">Snap Calls</h1>
                <p className="text-sm text-safety-orange font-bold uppercase tracking-wider">Never Miss A Job</p>
              </div>
            </div>
            <Link
              href="/login"
              className="btn-snap-light px-6 py-2 rounded-lg font-bold uppercase tracking-wide"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-white">
        <div className="text-center">
          <h2 className="text-5xl sm:text-6xl font-bold text-deep-black mb-6 uppercase tracking-tight" style={{textShadow: '3px 3px 0px rgba(255, 107, 0, 0.2)'}}>
            NEVER MISS ANOTHER CUSTOMER
          </h2>
          <p className="text-xl sm:text-2xl text-charcoal-text mb-4 font-bold uppercase tracking-wide">
            Fast Setup. Zero Missed Calls. Every Time.
          </p>
          <p className="text-lg text-charcoal-text mb-12 font-medium">
            Snap Calls - automated missed call responses for contractors and service businesses.
          </p>
          <Link
            href="/login"
            className="btn-snap-dark inline-block px-8 py-4 rounded-lg text-lg font-bold uppercase tracking-wide"
          >
            Get Started Now
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white border-4 border-safety-orange p-8 rounded-xl" style={{boxShadow: '0 4px 20px rgba(255, 107, 0, 0.15)'}}>
            <div className="w-12 h-12 bg-safety-orange rounded flex items-center justify-center mb-4 border-2 border-white" style={{boxShadow: '0 0 10px rgba(255, 255, 255, 0.3)'}}>
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-deep-black mb-3 uppercase tracking-wide">Instant Response</h3>
            <p className="text-charcoal-text font-medium">
              Automatically respond to missed calls with custom SMS messages. Your customers get an instant reply, every time.
            </p>
          </div>

          <div className="bg-white border-4 border-safety-orange p-8 rounded-xl" style={{boxShadow: '0 4px 20px rgba(255, 107, 0, 0.15)'}}>
            <div className="w-12 h-12 bg-safety-orange rounded flex items-center justify-center mb-4 border-2 border-white" style={{boxShadow: '0 0 10px rgba(255, 255, 255, 0.3)'}}>
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-deep-black mb-3 uppercase tracking-wide">Pay As You Go</h3>
            <p className="text-charcoal-text font-medium">
              99¢ a call at standard rates, down to as low as 67¢ based on discounts for higher wallet loads. No monthly fees, no contracts. Add funds to your wallet and only pay for what you use.
            </p>
          </div>

          <div className="bg-white border-4 border-safety-orange p-8 rounded-xl" style={{boxShadow: '0 4px 20px rgba(255, 107, 0, 0.15)'}}>
            <div className="w-12 h-12 bg-safety-orange rounded flex items-center justify-center mb-4 border-2 border-white" style={{boxShadow: '0 0 10px rgba(255, 255, 255, 0.3)'}}>
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-deep-black mb-3 uppercase tracking-wide">Custom Messages</h3>
            <p className="text-charcoal-text font-medium">
              Create personalized responses for different scenarios: standard, voicemail, and after-hours messages.
            </p>
          </div>

          <div className="bg-white border-4 border-safety-orange p-8 rounded-xl" style={{boxShadow: '0 4px 20px rgba(255, 107, 0, 0.15)'}}>
            <div className="w-12 h-12 bg-safety-orange rounded flex items-center justify-center mb-4 border-2 border-white" style={{boxShadow: '0 0 10px rgba(255, 255, 255, 0.3)'}}>
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-deep-black mb-3 uppercase tracking-wide">VIP Contacts</h3>
            <p className="text-charcoal-text font-medium">
              Mark important contacts as VIPs and track their calls. Give your best customers the attention they deserve.
            </p>
          </div>

          <div className="bg-white border-4 border-safety-orange p-8 rounded-xl" style={{boxShadow: '0 4px 20px rgba(255, 107, 0, 0.15)'}}>
            <div className="w-12 h-12 bg-safety-orange rounded flex items-center justify-center mb-4 border-2 border-white" style={{boxShadow: '0 0 10px rgba(255, 255, 255, 0.3)'}}>
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-deep-black mb-3 uppercase tracking-wide">Follow-Up Sequences</h3>
            <p className="text-charcoal-text font-medium">
              Automatically send follow-up messages to keep customers engaged. Build relationships on autopilot.
            </p>
          </div>

          <div className="bg-white border-4 border-safety-orange p-8 rounded-xl" style={{boxShadow: '0 4px 20px rgba(255, 107, 0, 0.15)'}}>
            <div className="w-12 h-12 bg-safety-orange rounded flex items-center justify-center mb-4 border-2 border-white" style={{boxShadow: '0 0 10px rgba(255, 255, 255, 0.3)'}}>
              <Phone className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-deep-black mb-3 uppercase tracking-wide">Business Hours</h3>
            <p className="text-charcoal-text font-medium">
              Set your business hours and send different messages during and after hours. Always stay professional.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 bg-deep-black border-4 border-safety-orange rounded-2xl p-12 text-center" style={{boxShadow: '0 0 30px rgba(255, 107, 0, 0.3)'}}>
          <h3 className="text-3xl font-bold text-white mb-4 uppercase tracking-wide">
            Ready to Capture Every Customer Call?
          </h3>
          <p className="text-xl text-white mb-8 font-medium">
            Setup takes 5 minutes. Start responding to missed calls today.
          </p>
          <Link
            href="/login"
            className="btn-snap-light inline-block px-8 py-4 rounded-lg text-lg font-bold uppercase tracking-wide"
          >
            Get Started Now
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t-4 border-safety-orange mt-20 bg-deep-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-white">
            <p className="font-bold uppercase tracking-wider">&copy; {new Date().getFullYear()} Snap Calls. Never miss another customer.</p>
            <p className="mt-2 text-sm text-gray-400">
              <a href="/terms" className="hover:text-safety-orange transition-colors">Terms of Service</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
