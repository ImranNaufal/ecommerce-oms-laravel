import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery('dashboard-stats', async () => {
    const res = await api.get('/dashboard/stats');
    return res.data.data;
  });

  const { data: salesChart } = useQuery('sales-chart', async () => {
    const res = await api.get('/dashboard/sales-chart');
    return res.data.data;
  }, { enabled: user?.role === 'admin' });

  const { data: activities } = useQuery('activities', async () => {
    const res = await api.get('/dashboard/activities?limit=5');
    return res.data.data;
  });

  const { data: alertData } = useQuery('system-alerts', async () => {
    const res = await api.get('/alerts');
    return res.data.data;
  });

  if (statsLoading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="spinner"></div></div>;
  }

  const getStatusStyle = (status) => {
    const styles = {
      pending: 'bg-warning/10 text-warning',
      delivered: 'bg-success/10 text-success',
      shipped: 'bg-info/10 text-info',
      cancelled: 'bg-danger/10 text-danger'
    };
    return styles[status] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="space-y-8 page-transition">
      {/* Welcome Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Selamat Datang, <span className="text-brand-600">{user?.full_name?.split(' ')[0]}</span></h1>
          <p className="text-slate-500 font-medium">Berikut adalah prestasi operasi setakat hari ini.</p>
        </div>
      </div>

      {/* Action Center Alerts */}
      {alertData?.alerts?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
          {alertData.alerts.map((alert, i) => (
            <div key={i} className={`p-4 rounded-2xl border flex items-start gap-4 transition-all hover:shadow-md ${
              alert.type === 'danger' ? 'bg-red-50 border-red-100 text-red-700' : 
              alert.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-700' : 
              'bg-blue-50 border-blue-100 text-blue-700'
            }`}>
              <div className={`p-2 rounded-xl bg-white shadow-sm`}>
                <ExclamationTriangleIcon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black uppercase tracking-widest mb-1">{alert.title}</p>
                <p className="text-sm font-medium opacity-80 mb-3">{alert.message}</p>
                <Link to={alert.action_url} className="text-xs font-black uppercase flex items-center gap-1 hover:gap-2 transition-all">
                  {alert.action_label} <ArrowRightIcon className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Orders', val: stats?.orders?.total_orders || 0, icon: ShoppingCartIcon, color: 'text-brand-600', bg: 'bg-brand-50', trend: `+${stats?.orders?.recent_orders || 0} new` },
          { label: 'Net Revenue', val: `RM${parseFloat(stats?.orders?.total_revenue || 0).toLocaleString()}`, icon: CurrencyDollarIcon, color: 'text-success', bg: 'bg-green-50', trend: 'Sales' },
          { label: 'Gross Profit', val: `RM${parseFloat(stats?.orders?.total_profit || 0).toLocaleString()}`, icon: ChartBarIcon, color: 'text-purple-600', bg: 'bg-purple-50', trend: `${stats?.orders?.profit_margin || 0}% margin` },
          { label: 'Pending Payout', val: `RM${parseFloat(stats?.commissions?.pending_commissions || 0).toLocaleString()}`, icon: ClockIcon, color: 'text-warning', bg: 'bg-amber-50', trend: 'Commission' }
        ].map((s, idx) => (
          <div key={idx} className="premium-card p-6 border-none shadow-soft flex flex-col justify-between group hover:border-brand-100 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`h-12 w-12 rounded-2xl ${s.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                <s.icon className={`h-6 w-6 ${s.color}`} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">{s.trend}</span>
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{s.label}</p>
              <h3 className="text-2xl font-black text-slate-900">{s.val}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 premium-card p-8 border-none shadow-soft overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Sales Analytics</h3>
            <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase">Last 30 Days</span>
          </div>
          <div className="h-[450px] w-full -ml-4">
            {salesChart && salesChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={salesChart}
                  margin={{ top: 40, right: 30, left: 0, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(d) => format(new Date(d), 'dd MMM')} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} 
                    minTickGap={30}
                  />
                  <YAxis hide={true} domain={[0, 'dataMax + 1000']} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '20px', 
                      border: 'none', 
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                      padding: '16px'
                    }}
                    itemStyle={{ fontSize: '16px', fontWeight: 'bold', color: '#0ea5e9' }}
                    labelStyle={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}
                    labelFormatter={(d) => format(new Date(d), 'dd MMM yyyy')}
                    formatter={(val) => [`RM ${parseFloat(val).toLocaleString()}`, 'Jualan']}
                    cursor={{ stroke: '#0ea5e9', strokeWidth: 2, strokeDasharray: '5 5' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#0ea5e9" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    activeDot={{ r: 8, strokeWidth: 0, fill: '#0ea5e9' }}
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <ChartBarIcon className="h-16 w-16 text-slate-200 mb-3" />
                <p className="text-sm font-medium">Tiada data jualan dalam 30 hari terakhir</p>
                <p className="text-xs mt-1">Data akan muncul selepas order pertama dibuat</p>
              </div>
            )}
          </div>
        </div>

        <div className="premium-card p-0 border-none shadow-soft overflow-hidden flex flex-col h-full">
          <div className="p-8 border-b border-slate-50 bg-slate-50/30">
            <h3 className="text-lg font-black text-slate-900">Recent Orders</h3>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px]">
            {activities?.map((a) => (
              <Link key={a.id} to={`/orders/${a.id}`} className="flex items-center gap-4 p-6 hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getStatusStyle(a.status)}`}>
                  {a.status === 'delivered' ? <CheckCircleIcon className="h-5 w-5" /> : <ClockIcon className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate">#{a.order_number}</p>
                  <p className="text-xs text-slate-500 font-bold uppercase">{a.customer_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">RM{parseFloat(a.total).toFixed(0)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
