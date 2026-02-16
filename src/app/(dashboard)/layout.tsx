'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Phone,
  LayoutDashboard,
  Wallet,
  MessageSquare,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Call Logs', href: '/calls', icon: Phone },
  { name: 'Wallet', href: '/wallet', icon: Wallet },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'VIP Contacts', href: '/vip', icon: Users },
  { name: 'Settings', href: '/settings/business', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Check if user has completed onboarding
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetch('/api/user/session')
        .then((res) => res.json())
        .then((data) => {
          if (data.hasCompletedOnboarding === false) {
            router.push('/onboarding');
          } else if (data.hasCompletedSetup === false) {
            router.push('/setup');
          }
          setCheckingOnboarding(false);
        })
        .catch(() => {
          setCheckingOnboarding(false);
        });
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, session, router]);

  // Show loading while checking onboarding
  if (status === 'loading' || checkingOnboarding) {
    return (
      <div className="min-h-screen bg-deep-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-safety-orange rounded flex items-center justify-center mx-auto mb-4 border-2 border-white" style={{boxShadow: '0 0 20px rgba(255, 107, 0, 0.5)'}}>
            <Phone className="w-10 h-10 text-white animate-pulse" />
          </div>
          <p className="text-white font-bold uppercase tracking-wider">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-deep-black border-b border-safety-orange z-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-safety-orange rounded flex items-center justify-center border-2 border-white" style={{boxShadow: '0 0 10px rgba(255, 255, 255, 0.3)'}}>
              <Phone className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white uppercase tracking-wide">Snap Calls</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-white hover:text-safety-orange snap-transition"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } pt-16 lg:pt-0`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="hidden lg:flex items-center space-x-2 px-6 py-6 border-b border-gray-200 bg-deep-black">
            <div className="w-10 h-10 bg-safety-orange rounded flex items-center justify-center border-2 border-white" style={{boxShadow: '0 0 10px rgba(255, 255, 255, 0.3)'}}>
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Snap Calls</h1>
              <p className="text-xs text-safety-orange font-bold uppercase tracking-wider">Never Miss A Job</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg snap-transition font-bold uppercase tracking-wide ${
                    isActive
                      ? 'bg-safety-orange text-white border-2 border-white' 
                      : 'text-charcoal-text hover:bg-safety-orange/10 hover:text-safety-orange'
                  }`}
                  style={isActive ? {boxShadow: '0 0 8px rgba(255, 107, 0, 0.4)'} : {}}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-xs">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 px-4 py-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm">
                <p className="font-bold text-charcoal-text truncate uppercase tracking-wide text-xs">
                  {session?.user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center space-x-2 px-3 py-2 text-charcoal-text hover:bg-safety-orange hover:text-white rounded-lg snap-transition font-bold uppercase tracking-wide text-xs"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 pt-16 lg:pt-0">
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {/* Overlay for mobile menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
