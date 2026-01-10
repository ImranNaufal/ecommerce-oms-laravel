import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../api';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  CurrencyDollarIcon, 
  TrophyIcon,
  HandThumbUpIcon,
  ChevronRightIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Commissions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status: '', page: 1 });

  const { data: summary } = useQuery('commission-summary', async () => {
    const res = await api.get('/commissions/summary');
    return res.data.data;
  });

  const { data: transactions, isLoading } = useQuery(['commission-transactions', filters], async () => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    params.append('page', filters.page);
    params.append('limit', '20');
    const res = await api.get(`/commissions/transactions?${params.toString()}`);
    return res.data;
  });

  const { data: leaderboard } = useQuery('commission-leaderboard', async () => {
    const res = await api.get('/commissions/leaderboard?period=month');
    return res.data.data;
  });

  // Admin Approval Mutation
  const approveMutation = useMutation(async (id) => {
    return await api.patch(`/commissions/${id}/approve`);
  }, {
    onSuccess: () => {
      toast.success('Komisen diluluskan!');
      queryClient.invalidateQueries('commission-transactions');
      queryClient.invalidateQueries('commission-summary');
      queryClient.invalidateQueries('dashboard-stats');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal meluluskan')
  });

  // Admin Payout Mutation
  const markPaidMutation = useMutation(async (id) => {
    return await api.patch(`/commissions/${id}/paid`);
  }, {
    onSuccess: () => {
      toast.success('Komisen ditanda sebagai DIBAYAR!');
      queryClient.invalidateQueries('commission-transactions');
      queryClient.invalidateQueries('commission-summary');
      queryClient.invalidateQueries('dashboard-stats');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal mengemaskini bayaran')
  });

  const getSummaryByStatus = (status) => summary?.summary?.find(s => s.status === status) || { count: 0, total_amount: 0 };

  const getStatusStyle = (status) => {
    const styles = { 
      pending: 'bg-warning/10 text-warning', 
      approved: 'bg-info/10 text-info', 
      paid: 'bg-success/10 text-success' 
    };
    return styles[status] || 'bg-slate-100 text-slate-600';
  };

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
                <BarChart data={[...summary.monthly].reverse()} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
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
                  <p className="text-xs font-black text-slate-900">RM{parseFloat(item.total_commission || 0).toFixed(0)}</p>
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

      {/* Transaction Table */}
      <div className="premium-card p-0 border-none shadow-soft overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
          <h3 className="text-lg font-black text-slate-900">Rekod Transaksi</h3>
          <select 
            className="bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest px-4 py-2 outline-none" 
            value={filters.status} 
            onChange={e => setFilters({...filters, status: e.target.value, page: 1})}
          >
            <option value="">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-hide">
          <table className="modern-table w-full relative">
            <thead className="sticky top-0 z-10">
              <tr>
                <th>Tarikh</th>
                <th>No. Pesanan</th>
                <th>Jenis</th>
                <th className="text-right">Komisen</th>
                <th className="text-center">Status</th>
                <th className="text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {isLoading ? (
                <tr><td colSpan="6" className="py-20 text-center"><div className="spinner mx-auto"></div></td></tr>
              ) : transactions?.data?.length > 0 ? (
                transactions.data.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-all">
                    <td>
                      <p className="text-sm font-bold text-slate-600">{format(new Date(t.created_at), 'dd MMM yyyy')}</p>
                    </td>
                    <td>
                      <p className="text-sm font-black text-slate-900">#{t.order_number}</p>
                    </td>
                    <td><span className="text-xs font-bold uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded">{t.commission_type}</span></td>
                    <td className="text-right text-sm font-black text-brand-600">RM {parseFloat(t.amount).toFixed(2)}</td>
                    <td className="text-center">
                      <span className={`status-badge text-[11px] ${getStatusStyle(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="text-right">
                      {user?.role === 'admin' && t.status === 'pending' && (
                        <button 
                          onClick={() => approveMutation.mutate(t.id)} 
                          disabled={approveMutation.isLoading}
                          className="p-2 bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-600 hover:text-white transition-all shadow-sm disabled:opacity-50"
                          title="Luluskan Komisen"
                        >
                          <HandThumbUpIcon className="h-4 w-4" />
                        </button>
                      )}
                      {user?.role === 'admin' && t.status === 'approved' && (
                        <button 
                          onClick={() => markPaidMutation.mutate(t.id)} 
                          disabled={markPaidMutation.isLoading}
                          className="p-2 bg-success/10 text-success rounded-lg hover:bg-success hover:text-white transition-all shadow-sm disabled:opacity-50"
                          title="Tanda Sudah Dibayar"
                        >
                          <BanknotesIcon className="h-4 w-4" />
                        </button>
                      )}
                      {t.status === 'paid' && (
                        <ChevronRightIcon className="h-4 w-4 text-slate-300 ml-auto" />
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="py-20 text-center text-slate-400 text-sm italic">Tiada rekod transaksi ditemui</td></tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {transactions?.pagination && transactions.pagination.pages > 1 && (
          <div className="p-6 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Halaman {filters.page} dari {transactions.pagination.pages}
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                disabled={filters.page === 1}
                className="px-6 py-2 text-xs font-black uppercase tracking-widest bg-white border border-slate-100 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
              >
                Sebelum
              </button>
              <button 
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                disabled={filters.page === transactions.pagination.pages}
                className="px-6 py-2 text-xs font-black uppercase tracking-widest bg-white border border-slate-100 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
              >
                Seterusnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
