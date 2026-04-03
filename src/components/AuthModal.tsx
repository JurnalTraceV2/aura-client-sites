import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { auth, ensureUserDocument } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      }
      await ensureUserDocument(userCredential.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authorization error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-8">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-display font-black text-xl text-black">A</div>
                <span className="font-display font-bold text-2xl tracking-wider">AURA</span>
              </div>

              <h2 className="text-3xl font-display font-bold mb-2">
                {isLogin ? 'Sign in' : 'Create account'}
              </h2>
              <p className="text-zinc-400 mb-8">
                {isLogin ? 'Use email/password to manage your subscription.' : 'Create an account to buy access.'}
              </p>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-white text-black font-bold text-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </>
                  ) : (
                    isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />
                  )}
                  {isLogin ? 'Sign in' : 'Create account'}
                </button>
              </form>

              <div className="mt-8 text-center">
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                  className="text-zinc-400 hover:text-white text-sm transition-colors"
                >
                  {isLogin ? 'No account? Create one' : 'Already have an account? Sign in'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
