import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LockClosedIcon, UserIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(formData.email, formData.password);
    if (success) navigate('/');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-slate-50 to-brand-100 p-4 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 bg-brand-400/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 h-80 w-80 bg-purple-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="premium-card p-10 border-none shadow-premium animate-slide-up">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="h-16 w-16 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-200 mr-3">
              <span className="text-white font-black text-2xl">O</span>
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">SystemOMS</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Enterprise Portal</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Alamat Emel</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="email" required className="input-modern pl-11" placeholder="admin@ecommerce.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Kata Laluan</label>
              <div className="relative">
                <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="password" required className="input-modern pl-11" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full btn-modern btn-modern-primary py-4 text-sm font-black uppercase tracking-[0.2em] relative overflow-hidden group">
              <span className="relative z-10 flex items-center justify-center gap-3">
                {loading ? 'Mengesahkan...' : <><span>Log Masuk</span><ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></>}
              </span>
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <LockClosedIcon className="h-3 w-3" /> Demo Credentials
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                <span className="font-bold text-slate-600">Admin</span>
                <span className="text-[10px] font-mono text-slate-400">admin@ecommerce.com</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                <span className="font-bold text-slate-600">Staff</span>
                <span className="text-[10px] font-mono text-slate-400">staff1@ecommerce.com</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                <span className="font-bold text-slate-600">Affiliate</span>
                <span className="text-[10px] font-mono text-slate-400">affiliate1@ecommerce.com</span>
              </div>
              <p className="text-center text-[10px] text-slate-500 font-bold pt-2 border-t border-slate-100 mt-3">Password: <code className="bg-white px-2 py-0.5 rounded text-brand-600 font-black">admin123</code></p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400 font-medium">Full Stack E-commerce Order Management System</p>
          <p className="text-[10px] text-slate-300 font-bold mt-1 uppercase tracking-widest">Portfolio Project • 2026</p>
        </div>
      </div>
    </div>
  );
}
