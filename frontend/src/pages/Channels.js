import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { validators } from '../utils/validators';
import { 
  PlusIcon, 
  ArrowPathIcon,
  CloudIcon,
  CheckCircleIcon,
  SignalIcon,
  Cog6ToothIcon,
  XMarkIcon,
  KeyIcon,
  LinkIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

export default function Channels() {
  const queryClient = useQueryClient();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [apiConfig, setApiConfig] = useState({ api_endpoint: '', api_key: '' });
  const [configErrors, setConfigErrors] = useState({});

  const { data: channels } = useQuery('channels', async () => {
    const res = await api.get('/channels');
    return res.data.data;
  });

  const syncMutation = useMutation(async (channelId) => {
    return await api.post(`/channels/${channelId}/sync`);
  }, {
    onSuccess: (response, channelId) => {
      toast.success(response.data.message || 'Channel synchronized successfully!');
      queryClient.invalidateQueries('channels');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'Failed to connect to API';
      toast.error(errorMessage);
      queryClient.invalidateQueries('channels'); // Refresh to update connection status
    }
  });

  const updateChannelMutation = useMutation(async ({ id, data }) => {
    return await api.put(`/channels/${id}`, data);
  }, {
    onSuccess: () => {
      toast.success('API Configuration saved!');
      setIsConfigModalOpen(false);
      queryClient.invalidateQueries('channels');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update configuration')
  });

  const openConfigModal = (channel) => {
    setSelectedChannel(channel);
    setApiConfig({
      api_endpoint: channel.api_endpoint || '',
      api_key: channel.api_key || ''
    });
    setConfigErrors({}); // Clear previous errors
    setIsConfigModalOpen(true);
  };

  const handleSaveConfig = () => {
    // Validate configuration
    const errors = {};
    
    // Validate API Endpoint (required and must be valid URL)
    if (selectedChannel.type !== 'website') {
      const urlError = validators.url(apiConfig.api_endpoint);
      if (!apiConfig.api_endpoint) {
        errors.api_endpoint = 'API Endpoint is required';
      } else if (urlError) {
        errors.api_endpoint = urlError;
      }
      
      // Validate API Key
      if (!apiConfig.api_key || apiConfig.api_key.trim() === '') {
        errors.api_key = 'API Key is required for external integrations';
      } else if (apiConfig.api_key.length < 10) {
        errors.api_key = 'API Key seems too short (minimum 10 characters)';
      }
    }
    
    setConfigErrors(errors);
    
    // Only submit if no errors
    if (Object.keys(errors).length === 0) {
      updateChannelMutation.mutate({
        id: selectedChannel.id,
        data: apiConfig
      });
    } else {
      toast.error('Please fix validation errors');
    }
  };

  const maskApiKey = (key) => {
    if (!key || key.length < 8) return key;
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  };

  const getChannelIcon = (type) => {
    const icons = { website: '🌐', shopee: '🛍️', lazada: '🛒', tiktok: '🎵', facebook: '👥' };
    return icons[type] || '📦';
  };

  const getChannelInstructions = (type) => {
    const instructions = {
      shopee: {
        endpoint: 'https://partner.shopeemobile.com',
        notes: [
          'Login to Shopee Open Platform (https://open.shopee.com/)',
          'Create an App to get Partner ID and Partner Key',
          'Enable "Order" permissions for your app',
          'Set webhook URL to: YOUR_DOMAIN/api/webhooks/order/external'
        ]
      },
      lazada: {
        endpoint: 'https://api.lazada.com.my/rest',
        notes: [
          'Register at Lazada Open Platform',
          'Create an App to get App Key and App Secret',
          'Format: AppKey:AppSecret (separated by colon)',
          'Subscribe to "Order Created" push notifications'
        ]
      },
      tiktok: {
        endpoint: 'https://open-api.tiktokglobalshop.com',
        notes: [
          'Register at TikTok Shop Partner Center',
          'Create an App to get App Key and App Secret',
          'Enable Order Management permissions',
          'Webhook URL: YOUR_DOMAIN/api/webhooks/order/external'
        ]
      },
      facebook: {
        endpoint: 'https://graph.facebook.com',
        notes: [
          'Login to Facebook Developer Portal',
          'Create a Facebook App for Commerce',
          'Get App ID and App Secret from Settings',
          'Enable Commerce API permissions'
        ]
      },
      website: {
        endpoint: 'N/A (Internal)',
        notes: [
          'This is your main website channel',
          'No external API configuration needed',
          'Orders created directly through the OMS interface',
          'Used for manual order entry and walk-in sales'
        ]
      }
    };
    return instructions[type] || {
      endpoint: '',
      notes: ['Contact marketplace support for API credentials', 'Check documentation for endpoint URL']
    };
  };

  return (
    <div className="space-y-10 page-transition">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">API <span className="text-brand-600">Integrations</span></h1>
          <p className="mt-2 text-slate-500 font-medium uppercase text-xs tracking-[0.2em]">Manage marketplace connections and webhooks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {channels?.map((channel) => (
          <div key={channel.id} className="premium-card p-0 border-none shadow-soft overflow-hidden group">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                  {getChannelIcon(channel.type)}
                </div>
                <span className={`status-badge text-[11px] flex items-center gap-1 ${
                  channel.connection_status === 'connected'
                    ? 'bg-success/10 text-success' 
                    : channel.connection_status === 'not_configured'
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-danger/10 text-danger'
                }`}>
                  <SignalIcon className="h-2 w-2" /> 
                  {channel.connection_status === 'connected'
                    ? 'Connected' 
                    : channel.connection_status === 'not_configured'
                      ? 'Not Configured' 
                      : 'Disconnected'
                  }
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">{channel.name}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{channel.type} Integration</p>
              
              {/* Connection Status Alert */}
              {channel.connection_status === 'disconnected' && (
                <div className="bg-danger/10 border border-danger/20 rounded-lg p-2 mb-4">
                  <p className="text-[10px] font-black text-danger uppercase flex items-center gap-1">
                    <ExclamationCircleIcon className="h-3 w-3" /> 
                    API Connection Failed
                  </p>
                  <p className="text-[9px] text-danger/70 mt-0.5">
                    Unable to reach API endpoint. Check credentials.
                  </p>
                </div>
              )}
              {channel.connection_status === 'not_configured' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-4">
                  <p className="text-[10px] font-black text-amber-700 uppercase flex items-center gap-1">
                    <ExclamationCircleIcon className="h-3 w-3" /> 
                    Setup Required
                  </p>
                  <p className="text-[9px] text-amber-600 mt-0.5">
                    Configure API credentials to enable sync.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Total Orders</p>
                  <p className="text-sm font-black text-slate-900">{channel.total_orders || 0}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Connection</p>
                  <p className={`text-sm font-black ${
                    channel.connection_status === 'connected' ? 'text-success' : 
                    channel.connection_status === 'not_configured' ? 'text-slate-400' : 
                    'text-danger'
                  }`}>
                    {channel.connection_status === 'connected' ? '✓ Online' : 
                     channel.connection_status === 'not_configured' ? 'Not Set' : 
                     '✗ Offline'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => syncMutation.mutate(channel.id)}
                  disabled={syncMutation.isLoading || channel.connection_status === 'not_configured'}
                  aria-label={`Sync ${channel.name}`}
                  className={`flex-1 btn-modern text-sm uppercase font-black tracking-widest transition-all ${
                    channel.connection_status === 'not_configured' 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                      : channel.connection_status === 'disconnected'
                        ? 'bg-danger text-white hover:bg-danger/80'
                        : 'bg-slate-900 text-white hover:bg-brand-600'
                  }`}
                  title={channel.connection_status === 'not_configured' ? 'Configure API first' : 'Sync with marketplace'}
                >
                  <ArrowPathIcon className={`h-3 w-3 ${syncMutation.isLoading ? 'animate-spin' : ''}`} /> 
                  {channel.connection_status === 'disconnected' ? 'Retry' : 'Sync Now'}
                </button>
                <button 
                  onClick={() => openConfigModal(channel)}
                  className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand-600 transition-all"
                  title="Configure API"
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-slate-400">
              <span>Last Sync: {channel.last_sync_at ? format(new Date(channel.last_sync_at), 'HH:mm') : 'Never'}</span>
              <span className="flex items-center gap-1">
                {channel.connection_status === 'connected' ? (
                  <><CheckCircleIcon className="h-3 w-3 text-success" /> API Active</>
                ) : channel.connection_status === 'not_configured' ? (
                  <><ExclamationCircleIcon className="h-3 w-3 text-slate-400" /> Not Setup</>
                ) : (
                  <><ExclamationCircleIcon className="h-3 w-3 text-danger" /> Failed</>
                )}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Configure API Modal */}
      {isConfigModalOpen && selectedChannel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsConfigModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-premium overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-900 text-white">
              <h2 className="text-xl font-black italic tracking-tighter uppercase">Configure {selectedChannel.name}</h2>
              <button onClick={() => setIsConfigModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveConfig(); }} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-black text-slate-400 uppercase mb-1 block flex items-center gap-2">
                  <LinkIcon className="h-3 w-3" /> API Endpoint URL
                </label>
                <input 
                  type="url" 
                  className={`input-modern ${configErrors.api_endpoint ? 'border-red-500 bg-red-50' : ''}`}
                  placeholder={getChannelInstructions(selectedChannel.type).endpoint}
                  value={apiConfig.api_endpoint}
                  onChange={e => {
                    setApiConfig({...apiConfig, api_endpoint: e.target.value});
                    setConfigErrors({...configErrors, api_endpoint: null});
                  }}
                />
                {configErrors.api_endpoint ? (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <ExclamationCircleIcon className="h-3 w-3" /> {configErrors.api_endpoint}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">The base URL for {selectedChannel.name} API</p>
                )}
              </div>
              <div>
                <label className="text-sm font-black text-slate-400 uppercase mb-1 block flex items-center gap-2">
                  <KeyIcon className="h-3 w-3" /> API Key / Secret
                </label>
                <input 
                  type="password" 
                  className={`input-modern font-mono text-sm ${configErrors.api_key ? 'border-red-500 bg-red-50' : ''}`}
                  placeholder="Enter your API credentials here"
                  value={apiConfig.api_key}
                  onChange={e => {
                    setApiConfig({...apiConfig, api_key: e.target.value});
                    setConfigErrors({...configErrors, api_key: null});
                  }}
                />
                {configErrors.api_key ? (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <ExclamationCircleIcon className="h-3 w-3" /> {configErrors.api_key}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedChannel.api_key ? `Current: ${maskApiKey(selectedChannel.api_key)}` : 'No key configured yet'}
                  </p>
                )}
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-black text-blue-900 uppercase mb-2 flex items-center gap-2">
                  📌 Setup Guide for {selectedChannel.name}:
                </p>
                <ul className="text-xs text-blue-700 space-y-1.5 ml-4 list-decimal">
                  {getChannelInstructions(selectedChannel.type).notes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
              <button 
                type="submit" 
                disabled={updateChannelMutation.isLoading}
                className="w-full btn-modern btn-modern-primary py-4 uppercase text-sm font-black tracking-[0.2em]"
              >
                {updateChannelMutation.isLoading ? 'Saving...' : 'Save Configuration'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
