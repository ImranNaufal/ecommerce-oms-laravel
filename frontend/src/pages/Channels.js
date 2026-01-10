import React from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { 
  PlusIcon, 
  ArrowPathIcon,
  CloudIcon,
  CheckCircleIcon,
  SignalIcon
} from '@heroicons/react/24/outline';

export default function Channels() {
  const queryClient = useQueryClient();
  const { data: channels } = useQuery('channels', async () => {
    const res = await axios.get('/api/channels');
    return res.data.data;
  });

  const syncMutation = useMutation(async (channelId) => {
    return await axios.post(`/api/channels/${channelId}/sync`);
  }, {
    onSuccess: (_, channelId) => {
      toast.success(`Channel #${channelId} berjaya disinkronis!`);
      queryClient.invalidateQueries('channels');
    },
    onError: () => toast.error('Gagal menyambung ke API Channel')
  });

  const getChannelIcon = (type) => {
    const icons = { website: '🌐', shopee: '🛍️', lazada: '🛒', tiktok: '🎵', facebook: '👥' };
    return icons[type] || '📦';
  };

  return (
    <div className="space-y-10 page-transition">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">API <span className="text-brand-600">Integrations</span></h1>
          <p className="mt-2 text-slate-500 font-medium uppercase text-xs tracking-[0.2em]">Urus sambungan marketplace dan webhooks</p>
        </div>
        <button className="btn-modern btn-modern-primary">
          <CloudIcon className="h-4 w-4" /> Hubung Channel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {channels?.map((channel) => (
          <div key={channel.id} className="premium-card p-0 border-none shadow-soft overflow-hidden group">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                  {getChannelIcon(channel.type)}
                </div>
                <span className={`status-badge text-[11px] flex items-center gap-1 ${channel.is_active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                  <SignalIcon className="h-2 w-2" /> {channel.is_active ? 'Connected' : 'Offline'}
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">{channel.name}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">{channel.type} Integration</p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Total Orders</p>
                  <p className="text-sm font-black text-slate-900">{channel.total_orders || 0}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Health Score</p>
                  <p className="text-sm font-black text-success">98%</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => syncMutation.mutate(channel.id)}
                  disabled={syncMutation.isLoading}
                  className="flex-1 btn-modern bg-slate-900 text-white text-sm uppercase font-black tracking-widest hover:bg-brand-600 transition-all"
                >
                  <ArrowPathIcon className={`h-3 w-3 ${syncMutation.isLoading ? 'animate-spin' : ''}`} /> Sync Now
                </button>
                <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand-600 transition-all">
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-slate-400">
              <span>Last Sync: {channel.last_sync_at ? format(new Date(channel.last_sync_at), 'HH:mm') : 'Never'}</span>
              <span className="flex items-center gap-1"><CheckCircleIcon className="h-3 w-3 text-success" /> API Secure</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
