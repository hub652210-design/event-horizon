import React, { useState } from 'react';
import { useAuth } from '../lib/FirebaseProvider';
import { Mail, Lock, User as UserIcon, Sparkles, AlertCircle, RefreshCw, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AuthModal() {
  const { loginWithEmail, registerWithEmail, loginWithGoogle, continueAsGuest } = useAuth();
  
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all requested fields.');
      return;
    }
    if (isRegister && !username) {
      setError('Username is required for first registration.');
      return;
    }
    setError(null);
    setLoading(true);
    
    try {
      if (isRegister) {
        await registerWithEmail(email, password, username);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Incorrect email or password combination.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email & Password sign-in is not enabled in your Firebase console. Please go to your Firebase Console -> Build -> Authentication -> Sign-in method tab and enable the "Email/Password" provider.');
      } else {
        setError(err.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Google Sign-in is not enabled in your Firebase console. Please go to your Firebase Console -> Build -> Authentication -> Sign-in method tab and enable the "Google" provider.');
      } else {
        setError(err.message || 'Google Login was cancelled or failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      id="space_auth_gateway_backdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#010103] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(255,255,255,0))]"
    >
      {/* Background stardust particle simulator simulation wrapper */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping duration-[3s]" />
        <div className="absolute top-2/3 left-[70%] w-1 h-1 bg-cyan-400 rounded-full animate-ping duration-[5s]" />
        <div className="absolute top-1/2 left-[15%] w-2 h-2 bg-indigo-500 rounded-full animate-pulse duration-[4s]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.95 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        id="auth_modal_main_card" 
        className="relative z-10 w-full max-w-[460px] p-8 md:p-10 mx-4 bg-zinc-950/75 border border-zinc-850 rounded-[28px] shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-xl overflow-hidden"
      >
        {/* Subtle glow border */}
        <div className="absolute inset-0 rounded-[28px] border border-white/5 pointer-events-none" />
        <div className="absolute -top-[120px] -right-[120px] w-[240px] h-[240px] bg-gradient-to-tr from-amber-500/20 to-red-500/0 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-[120px] -left-[120px] w-[240px] h-[240px] bg-gradient-to-tr from-cyan-500/20 to-blue-500/0 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-cyan-500 p-[1.5px] shadow-lg shadow-orange-500/10 mb-4 animate-pulse">
            <div className="w-full h-full bg-[#050508] rounded-[14px] flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
            CINE<span className="text-amber-500">ORBIT</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-2 tracking-widest uppercase">
            {isRegister ? 'Register your Space Node' : 'Enter the movie tracker universe'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {isRegister && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5"
              >
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400">Username/Alias</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. CinemaVoyager"
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none text-sm text-white placeholder-zinc-600 transition"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@vessel.com"
                className="w-full pl-10 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none text-sm text-white placeholder-zinc-600 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5 font-sans">
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400">Navigation Key (Password)</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none text-sm text-white placeholder-zinc-600 transition"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/30 border border-red-900/40 rounded-xl text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="relative w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold uppercase tracking-wider text-xs rounded-xl hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.01] transition duration-200 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
            ) : isRegister ? (
              'Initialize Account'
            ) : (
              'Warp into Account'
            )}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-850" /></div>
          <span className="relative px-3 bg-[#0c0c11] text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Or bypass gateway</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex items-center justify-center gap-2 py-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700/80 rounded-xl text-zinc-300 text-xs font-semibold tracking-wider uppercase transition cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Google
          </button>

          <button
            onClick={continueAsGuest}
            disabled={loading}
            className="flex items-center justify-center gap-2 py-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700/80 rounded-xl text-zinc-300 text-xs font-semibold tracking-wider uppercase transition cursor-pointer"
          >
            Guest Mode
          </button>
        </div>

        <div className="text-center mt-8 text-xs">
          <p className="text-zinc-500">
            {isRegister ? 'Already registered?' : 'New explorer?'}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(null); }}
              className="text-amber-500 hover:text-amber-400 font-bold ml-1.5 underline focus:outline-none transition"
            >
              {isRegister ? 'Back to Login' : 'Create Space Node'}
            </button>
          </p>
        </div>

        {/* Guest fallback terms prompt message */}
        <div id="auth_disclaimer" className="mt-8 flex gap-2 justify-center items-center text-[10px] text-zinc-600 font-mono text-center border-t border-zinc-900 pt-5">
          <Star className="w-3 h-3 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
          <span>REAL-TIME MULTI-DEVICE CLOUD SYNC ACTIVE</span>
        </div>
      </motion.div>
    </div>
  );
}
