import React from 'react';
import { useQuery } from 'react-query';
import api from '../api';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { 
  CurrencyDollarIcon, 
  TrophyIcon
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Commissions() {
  const { user } = useAuth();

  const { data: summary } = useQuery('commission-summary', async () => {
    const res = await api.get('/commissions/summary');
    return res.data.data;
  });

  const { data: transactions } = useQuery('commission-transactions', async () => {
    const res = await api.get('/commissions/transactions?limit=20');
    return res.data;
  });

  const { data: leaderboard } = useQuery('commission-leaderboard', async () => {
    const res = await api.get('/commissions/leaderboard?period=month');
    return res.data.data;
  });

  const getSummaryByStatus = (status) => summary?.summary?.find(s => s.status === status) || { count: 0, total_amount: 0 };

  return (
    <div className="space-y-10 page-transition">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">Earning <span className="text-brand-600">Portal</span></h1>
          <p className="mt-2 text-slate-500 font-medium uppercase text-xs tracking-[0.2em]">Pantau prestasi dan bayaran komisen</p>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Menunggu', key: 'pending', color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Diluluskan', key: 'approved', color: 'text-info', bg: 'bg-info/10' },
          { label: 'Dibayar', key: 'paid', color: 'text-success', bg: 'bg-success/10' },
          { label: 'Kadar Semasa', val: `${summary?.config?.commission_value || (user?.role === 'admin' ? '10' : '0')}%`, color: 'text-brand-600', bg: 'bg-brand-50' }
        ].map((item, idx) => {
          const data = item.key ? getSummaryByStatus(item.key) : null;
          return (
            <div key={idx} className="premium-card p-6 border-none shadow-soft group">
              <div className={`h-12 w-12 rounded-2xl ${item.bg} flex items-center justify-center mb-4 transition-transform group-hover:rotate-12`}>
                <CurrencyDollarIcon className={`h-6 w-6 ${item.color}`} />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
              <h3 className="text-2xl font-black text-slate-900">{item.val || `RM ${parseFloat(data?.total_amount || 0).toLocaleString()}`}</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">{data ? `${data.count} Transaksi` : (user?.role === 'admin' ? 'Overview' : 'Tier Active')}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Monthly Chart */}
        <div className="lg:col-span-2 premium-card p-8 border-none shadow-soft overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-900 tracking-tight text-brand-600">Prestasi Bulanan</h3>
          </div>
          <div className="h-[350px] w-full -ml-4">
            {summary?.monthly && summary.monthly.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.monthly.reverse()} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                  />
                  <YAxis hide={true} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [`RM ${parseFloat(value).toFixed(2)}`, 'Komisen']}
                  />
                  <Bar dataKey="total_amount" radius={[6, 6, 0, 0]} barSize={40}>
                    {summary.monthly.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === summary.monthly.length - 1 ? '#0ea5e9' : '#e2e8f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
                Data bulanan akan muncul selepas transaksi berjaya
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="premium-card p-0 border-none shadow-soft overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-900 text-white">
            <div className="flex items-center gap-3">
              <TrophyIcon className="h-6 w-6 text-warning" />
              <h3 className="text-lg font-black italic tracking-tighter uppercase">Top Affiliate</h3>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {leaderboard && leaderboard.length > 0 ? leaderboard.map((item, idx) => (
              <div key={item.id} className={`flex items-center gap-4 p-4 rounded-2xl ${item.id === user.id ? 'bg-brand-50 border border-brand-100' : 'bg-slate-50'}`}>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-warning text-white' : 'bg-white text-slate-400'}`}>
                  #{idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate">{item.full_name}</p>
                  <p className="text-xs font-bold text-brand-600 uppercase">{item.tier || 'Silver'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">RM{parseFloat(item.total_commission || 0).toFixed(0)}</p>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center">
                <TrophyIcon className="h-12 w-12 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400 font-medium">Tiada data prestasi bulan ini</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Table (if have data) */}
      {transactions?.data && transactions.data.length > 0 && (
        <div className="premium-card p-0 border-none shadow-soft overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-50/30">
            <h3 className="text-lg font-black text-slate-900">Rekod Transaksi</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="modern-table w-full">
              <thead>
                <tr>
                  <th>Tarikh</th>
                  <th>No. Pesanan</th>
                  <th>Jenis</th>
                  <th className="text-right">Komisen</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transactions.data.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="text-sm font-bold text-slate-600">{format(new Date(t.created_at), 'dd MMM yyyy')}</td>
                    <td className="text-sm font-black text-slate-900">#{t.order_number}</td>
                    <td><span className="text-xs font-bold uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded">{t.commission_type}</span></td>
                    <td className="text-right text-sm font-black text-brand-600">RM {parseFloat(t.amount).toFixed(2)}</td>
                    <td className="text-center">
                      <span className={`status-badge ${
                        t.status === 'pending' ? 'bg-warning/10 text-warning' :
                        t.status === 'approved' ? 'bg-info/10 text-info' :
                        'bg-success/10 text-success'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
