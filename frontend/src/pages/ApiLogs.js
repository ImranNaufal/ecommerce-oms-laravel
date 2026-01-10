import React, { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function ApiLogs() {
  const [filter, setFilter] = useState('all');

  const { data: logs, isLoading, refetch } = useQuery('api-logs', async () => {
    const res = await axios.get('/api/channels/logs/all');
    return res.data.data;
  });

  const filteredLogs = logs?.filter(log => {
    if (filter === 'success') return log.success;
    if (filter === 'error') return !log.success;
    return true;
  });

  return (
    <div className="space-y-10 page-transition">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">System <span className="text-brand-600">Logs</span></h1>
          <p className="mt-2 text-slate-500 font-medium uppercase text-xs tracking-[0.2em]">Monitoring integrasi API dan troubleshooting</p>
        </div>
        <button onClick={() => refetch()} className="btn-modern bg-white border border-slate-200 text-slate-600">
          <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Logs
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 w-fit rounded-2xl">
        {['all', 'success', 'error'].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === t ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="table-container">
        <table className="modern-table w-full">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Endpoint</th>
              <th>Status</th>
              <th>Message / Error</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? <tr><td colSpan="5" className="py-20 text-center"><div className="spinner mx-auto"></div></td></tr> :
              filteredLogs?.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="whitespace-nowrap">
                    <p className="text-xs font-bold text-slate-700">{format(new Date(log.created_at), 'dd MMM, HH:mm:ss')}</p>
                  </td>
                  <td>
                    <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">{log.method} {log.endpoint}</span>
                  </td>
                  <td>
                    {log.success ? 
                      <span className="status-badge bg-success/10 text-success flex items-center gap-1 w-fit"><CheckCircleIcon className="h-3 w-3" /> 200 OK</span> :
                      <span className="status-badge bg-danger/10 text-danger flex items-center gap-1 w-fit"><ExclamationTriangleIcon className="h-3 w-3" /> Error</span>
                    }
                  </td>
                  <td className="max-w-xs truncate">
                    <p className="text-xs text-slate-500 italic">{log.error_message || 'Request successful'}</p>
                  </td>
                  <td className="text-right">
                    <button className="text-xs font-black text-brand-600 uppercase hover:underline">View Payload</button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
