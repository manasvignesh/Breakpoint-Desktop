import React, { useState } from 'react';
import { X, LogIn, LogOut, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { firebaseUser, userProfile, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      onClose();
    } catch (err: any) {
      console.error('[AuthModal] Sign in error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Access temporarily disabled due to many failed attempts. Try again later.');
      } else {
        setError(err.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Sign out failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#12141A] border border-[#232734] rounded-2xl shadow-2xl p-6 text-[#F0F3F6]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#8B949E] hover:text-[#F0F3F6] hover:bg-[#181B22] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {firebaseUser ? (
          /* Signed In View */
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-[#232734]">
              <div className="w-12 h-12 rounded-full bg-[#FF5A1F]/20 text-[#FF5A1F] border border-[#FF5A1F]/40 flex items-center justify-center text-lg font-bold">
                {(userProfile?.name || firebaseUser.email || 'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-[#F0F3F6] truncate">
                    {userProfile?.name || 'Breakpoint Reader'}
                  </h3>
                  {userProfile?.isStaff && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FF5A1F] text-white">
                      STAFF
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#8B949E] truncate">
                  {firebaseUser.email}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 rounded-xl bg-[#0F1015] border border-[#232734]">
                <span className="text-[#8B949E]">Firebase UID</span>
                <span className="font-mono text-[#C9D1D9] truncate max-w-[200px]" title={firebaseUser.uid}>
                  {firebaseUser.uid}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-[#0F1015] border border-[#232734]">
                <span className="text-[#8B949E]">Role</span>
                <span className="font-medium text-[#FF5A1F] uppercase">
                  {userProfile?.role || 'Student'}
                </span>
              </div>
              {userProfile?.connectionCode && (
                <div className="flex justify-between p-2.5 rounded-xl bg-[#0F1015] border border-[#232734]">
                  <span className="text-[#8B949E]">Connection Code</span>
                  <span className="font-mono font-bold text-[#F0F3F6]">
                    {userProfile.connectionCode}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#232734] hover:bg-[#2F3446] text-sm font-semibold text-[#F0F3F6] transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          /* Sign In Form */
          <div className="space-y-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[#FF5A1F] font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Breakpoint Identity</span>
              </div>
              <h2 className="text-xl font-bold font-display text-[#F0F3F6]">
                Sign In to Breakpoint
              </h2>
              <p className="text-xs text-[#8B949E]">
                Use your existing Breakpoint / CIE Daily credentials to sync your reading history, library, and settings.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#C9D1D9]">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@college.edu or gmail.com"
                  className="w-full px-3.5 py-2.5 bg-[#0F1015] border border-[#232734] focus:border-[#FF5A1F] rounded-xl text-sm text-[#F0F3F6] placeholder-[#8B949E] outline-none transition"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#C9D1D9]">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-[#0F1015] border border-[#232734] focus:border-[#FF5A1F] rounded-xl text-sm text-[#F0F3F6] placeholder-[#8B949E] outline-none transition"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FF5A1F] hover:bg-[#FF7A45] text-white font-semibold text-sm shadow-lg shadow-[#FF5A1F]/20 transition disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-[#232734] text-center">
              <p className="text-[11px] text-[#8B949E]">
                Firebase Auth Project: <strong className="text-[#C9D1D9]">cie-connect</strong>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
