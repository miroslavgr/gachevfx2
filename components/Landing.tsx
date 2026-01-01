
import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, Chrome, Facebook, Key, User, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { AuthService } from '../services/api';

interface LandingProps {
  onLoginSuccess: (user: any) => void;
}

const Landing: React.FC<LandingProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register_token' | 'register_details'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Registration State
  const [token, setToken] = useState('');
  const [validToken, setValidToken] = useState<string | null>(null);
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const { t, language, setLanguage } = useLanguage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    
    const res = await AuthService.login(email, password);
    
    if (res.success && res.data) {
        onLoginSuccess(res.data);
    } else {
        setErrorMsg(res.message || 'Login failed');
    }
    setIsLoading(false);
  };

  const handleValidateToken = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setErrorMsg('');

      const res = await AuthService.validateToken(token);
      
      if (res.success && res.data) {
          setValidToken(res.data.code);
          setAuthMode('register_details');
      } else {
          setErrorMsg(res.message || 'Invalid token');
      }
      setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validToken) return;
      setIsLoading(true);
      setErrorMsg('');

      const res = await AuthService.register({ name, email, password, token: validToken });

      if (res.success && res.data) {
          onLoginSuccess(res.data);
      } else {
          setErrorMsg(res.message || 'Registration failed');
      }
      setIsLoading(false);
  };

  return (
    <div className="min-h-screen font-sans flex items-center justify-center relative overflow-hidden bg-dark-950">
      {/* Background Visuals */}
      <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-dark-950 to-black"></div>
          {/* Animated Grid Lines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]"></div>
          
          {/* Floating Glows */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-500/10 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
      </div>

      {/* Language Switcher Top Right */}
      <div className="absolute top-6 right-6 z-20 flex gap-2">
          <button onClick={() => setLanguage('bg')} className={`px-3 py-1 rounded-full border text-xs font-bold transition-all ${language === 'bg' ? 'bg-gold-500 text-dark-900 border-gold-500' : 'text-slate-400 border-slate-700'}`}>BG</button>
          <button onClick={() => setLanguage('en')} className={`px-3 py-1 rounded-full border text-xs font-bold transition-all ${language === 'en' ? 'bg-gold-500 text-dark-900 border-gold-500' : 'text-slate-400 border-slate-700'}`}>EN</button>
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-5xl h-[600px] glass-panel rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/10">
          
          {/* Left Side: Branding */}
          <div className="md:w-1/2 p-12 flex flex-col justify-between bg-gradient-to-br from-slate-900/50 to-slate-950/50 relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-500 to-transparent opacity-50"></div>
              
              <div>
                  <h1 className="text-4xl font-serif font-bold text-white mb-2 tracking-tight">{t('app.name')}</h1>
                  <p className="text-gold-500 font-medium tracking-widest text-xs uppercase">{t('app.slogan')}</p>
              </div>

              <div className="space-y-6">
                  <div className="glass-panel p-6 rounded-xl border-l-2 border-gold-500">
                      <p className="text-slate-300 italic text-lg leading-relaxed">"Trading is not about being right, it's about being profitable. Master the process, and the results will follow."</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex -space-x-2">
                          {[1,2,3,4].map(i => (
                              <img key={i} src={`https://picsum.photos/40/40?random=${i+10}`} className="w-8 h-8 rounded-full border-2 border-slate-900" alt="member"/>
                          ))}
                      </div>
                      <span>Join 1,200+ Active Traders</span>
                  </div>
              </div>

              <div className="text-xs text-slate-600">
                  &copy; 2024 ProScalp. All rights reserved.
              </div>
          </div>

          {/* Right Side: Dynamic Form */}
          <div className="md:w-1/2 bg-slate-900/80 backdrop-blur-xl p-12 flex flex-col justify-center">
              <div className="max-w-xs mx-auto w-full">
                  
                  {/* --- MODE: LOGIN --- */}
                  {authMode === 'login' && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                          <h2 className="text-2xl font-bold text-white mb-1">{t('auth.login')}</h2>
                          <p className="text-slate-400 text-sm mb-6">{t('auth.welcome_back')}</p>

                          <form onSubmit={handleLogin} className="space-y-4">
                              <div className="space-y-1">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t('auth.email')}</label>
                                  <div className="relative group">
                                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-gold-500 transition-colors" size={18} />
                                      <input 
                                          type="text" 
                                          value={email}
                                          onChange={(e) => setEmail(e.target.value)}
                                          className="w-full bg-dark-950 border border-slate-700 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-slate-600 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none transition-all"
                                          placeholder="admin@proscalp.com"
                                      />
                                  </div>
                              </div>

                              <div className="space-y-1">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t('auth.password')}</label>
                                  <div className="relative group">
                                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-gold-500 transition-colors" size={18} />
                                      <input 
                                          type="password"
                                          value={password}
                                          onChange={(e) => setPassword(e.target.value)}
                                          className="w-full bg-dark-950 border border-slate-700 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-slate-600 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none transition-all"
                                          placeholder="••••••••"
                                      />
                                  </div>
                              </div>

                              {errorMsg && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}

                              <button 
                                  type="submit"
                                  disabled={isLoading}
                                  className="w-full py-4 mt-4 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-dark-900 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                  {isLoading ? <Loader2 className="animate-spin" /> : <>{t('auth.submit')} <ArrowRight size={18} /></>}
                              </button>
                          </form>
                          
                          <div className="mt-6 text-center">
                              <button onClick={() => setAuthMode('register_token')} className="text-sm text-slate-400 hover:text-gold-500 transition-colors">
                                  Don't have an account? <span className="font-bold underline">Apply here</span>
                              </button>
                          </div>
                      </div>
                  )}

                  {/* --- MODE: REGISTER STEP 1 (TOKEN) --- */}
                  {authMode === 'register_token' && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                          <button onClick={() => setAuthMode('login')} className="flex items-center gap-2 text-slate-500 hover:text-white mb-6 text-sm transition-colors">
                              <ArrowLeft size={16} /> Back to Login
                          </button>
                          <h2 className="text-2xl font-bold text-white mb-1">Invitation Required</h2>
                          <p className="text-slate-400 text-sm mb-6">Enter the access token provided by the administrator.</p>

                          <form onSubmit={handleValidateToken} className="space-y-4">
                              <div className="space-y-1">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Access Token</label>
                                  <div className="relative group">
                                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-gold-500 transition-colors" size={18} />
                                      <input 
                                          type="text" 
                                          value={token}
                                          onChange={(e) => setToken(e.target.value)}
                                          className="w-full bg-dark-950 border border-slate-700 rounded-xl py-3.5 pl-12 pr-4 text-white font-mono placeholder-slate-600 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none transition-all uppercase"
                                          placeholder="XXXX-XXXX-XXXX"
                                      />
                                  </div>
                              </div>

                              {errorMsg && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}

                              <button 
                                  type="submit"
                                  disabled={isLoading}
                                  className="w-full py-4 mt-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)] flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                  {isLoading ? <Loader2 className="animate-spin" /> : <>Validate Token <ArrowRight size={18} /></>}
                              </button>
                          </form>
                      </div>
                  )}

                  {/* --- MODE: REGISTER STEP 2 (DETAILS) --- */}
                  {authMode === 'register_details' && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                          <div className="flex items-center gap-2 mb-4 text-green-400 text-sm font-bold bg-green-500/10 p-2 rounded-lg border border-green-500/20">
                              <CheckCircle size={16} /> Token Verified
                          </div>
                          
                          <h2 className="text-2xl font-bold text-white mb-1">Create Account</h2>
                          <p className="text-slate-400 text-sm mb-6">Complete your profile details.</p>

                          <form onSubmit={handleRegister} className="space-y-3">
                              <div className="space-y-1">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</label>
                                  <div className="relative group">
                                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-gold-500 transition-colors" size={18} />
                                      <input 
                                          type="text" 
                                          value={name}
                                          onChange={(e) => setName(e.target.value)}
                                          className="w-full bg-dark-950 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-600 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none transition-all"
                                          placeholder="John Doe"
                                      />
                                  </div>
                              </div>

                              <div className="space-y-1">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t('auth.email')}</label>
                                  <div className="relative group">
                                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-gold-500 transition-colors" size={18} />
                                      <input 
                                          type="text" 
                                          value={email}
                                          onChange={(e) => setEmail(e.target.value)}
                                          className="w-full bg-dark-950 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-600 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none transition-all"
                                          placeholder="you@email.com"
                                      />
                                  </div>
                              </div>

                              <div className="space-y-1">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t('auth.password')}</label>
                                  <div className="relative group">
                                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-gold-500 transition-colors" size={18} />
                                      <input 
                                          type="password"
                                          value={password}
                                          onChange={(e) => setPassword(e.target.value)}
                                          className="w-full bg-dark-950 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-600 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none transition-all"
                                          placeholder="••••••••"
                                      />
                                  </div>
                              </div>

                              {errorMsg && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}

                              <button 
                                  type="submit"
                                  disabled={isLoading}
                                  className="w-full py-4 mt-4 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-dark-900 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                  {isLoading ? <Loader2 className="animate-spin" /> : <>{t('auth.register_submit')} <ArrowRight size={18} /></>}
                              </button>
                          </form>
                      </div>
                  )}
                  
                  {/* Footer Links (Only on login) */}
                  {authMode === 'login' && (
                      <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                            <p className="text-xs text-slate-600 mb-2">{t('auth.demo_login')}</p>
                            <div className="flex gap-2 justify-center">
                                <button onClick={() => { setEmail('sarah@demo.com'); setPassword('demo'); }} className="text-xs px-3 py-1 bg-slate-800 rounded text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">Trader</button>
                                <button onClick={() => { setEmail('admin@proscalp.com'); setPassword('admin'); }} className="text-xs px-3 py-1 bg-slate-800 rounded text-slate-400 hover:bg-gold-500/20 hover:text-gold-500 transition-colors">Mentor</button>
                            </div>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default Landing;
