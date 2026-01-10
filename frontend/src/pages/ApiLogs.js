import React, { useState } from 'react';
import { useQuery } from 'react-query';
import api from '../api';
import { format } from 'date-fns';
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  ArrowPathIcon,
  XMarkIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

export default function ApiLogs() {
  const [filter, setFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);

  const { data: logs, isLoading, refetch } = useQuery('api-logs', async () => {
    const res = await api.get('/channels/logs/all');
    return res.data.data;
  });

  const filteredLogs = logs?.filter(log => {
    if (filter === 'success') return log.success;
    if (filter === 'error') return !log.success;
    return true;
  });

  const openPayloadModal = (log) => {
    setSelectedLog(log);
  };

  const formatJSON = (jsonString) => {
    if (!jsonString) return 'No data';
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonString;
    }
  };

  return (
    <div className="space-y-10 page-transition">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">System <span className="text-brand-600">Logs</span></h1>
          <p className="mt-2 text-slate-500 font-medium uppercase text-xs tracking-[0.2em]">API monitoring and troubleshooting</p>
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
              filteredLogs?.length > 0 ? filteredLogs.map(log => (
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
                    <button 
                      onClick={() => openPayloadModal(log)}
                      className="text-xs font-black text-brand-600 uppercase hover:underline flex items-center gap-1 ml-auto"
                    >
                      <DocumentTextIcon className="h-3 w-3" /> View Payload
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="5" className="py-20 text-center text-slate-400 text-sm">No API logs found</td></tr>
              )
            }
          </tbody>
        </table>
      </div>

      {/* Payload Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setSelectedLog(null)}></div>
          <div className="relative bg-white w-full max-w-4xl rounded-3xl shadow-premium overflow-hidden animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-900 text-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-black italic tracking-tighter uppercase">API Request Details</h2>
                <p className="text-sm font-medium opacity-70">{selectedLog.method} {selectedLog.endpoint}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-white/10 rounded-xl"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Meta Information */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-xs font-black text-slate-400 uppercase mb-1">Timestamp</p>
                  <p className="text-sm font-bold text-slate-900">{format(new Date(selectedLog.created_at), 'dd MMM yyyy, HH:mm:ss')}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-xs font-black text-slate-400 uppercase mb-1">Status</p>
                  <p className={`text-sm font-black ${selectedLog.success ? 'text-success' : 'text-danger'}`}>
                    {selectedLog.success ? 'SUCCESS' : 'FAILED'}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-xs font-black text-slate-400 uppercase mb-1">Channel</p>
                  <p className="text-sm font-bold text-slate-900">{selectedLog.channel_name || 'N/A'}</p>
                </div>
              </div>

              {/* Request Payload */}
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                  📤 Request Payload
                </h3>
                <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-xs text-green-400 font-mono leading-relaxed">
                    {formatJSON(selectedLog.request_payload)}
                  </pre>
                </div>
              </div>

              {/* Response Payload */}
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                  📥 Response Payload
                </h3>
                <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-xs text-cyan-400 font-mono leading-relaxed">
                    {formatJSON(selectedLog.response_payload)}
                  </pre>
                </div>
              </div>

              {/* Error Details (if any) */}
              {selectedLog.error_message && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <h3 className="text-sm font-black text-red-900 uppercase tracking-widest mb-2">❌ Error Details:</h3>
                  <p className="text-sm text-red-700 font-mono">{selectedLog.error_message}</p>
                </div>
              )}

              {/* Troubleshooting Tips */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-2">💡 Troubleshooting Tips:</h3>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  {selectedLog.success ? (
                    <>
                      <li>Request completed successfully</li>
                      <li>Check response payload for returned data</li>
                    </>
                  ) : (
                    <>
                      <li>Check if API endpoint URL is correct</li>
                      <li>Verify API key/credentials are valid</li>
                      <li>Ensure marketplace API is online (not under maintenance)</li>
                      <li>Check request payload format matches API documentation</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
