import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { 
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

export default function Orders() {
  const [filters, setFilters] = useState({ status: '', payment_status: '', page: 1 });

  const { data, isLoading } = useQuery(['orders', filters], async () => {
    const params = new URLSearchParams(filters);
    params.append('limit', '20');
    const res = await axios.get(`/api/orders?${params.toString()}`);
    return res.data;
  });

  const handleExport = () => {
    if (!data?.data) return;
    
    // Header CSV
    const headers = ["Order Number", "Customer", "Total (RM)", "Status", "Payment", "Date"];
    
    // Data Rows
    const rows = data.data.map(o => [
      o.order_number,
      o.customer_name,
      o.total,
      o.status,
      o.payment_status,
      format(new Date(o.created_at), 'yyyy-MM-dd')
    ]);

    // Combine
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    
    // Download Link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Sales_Report_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusStyle = (status) => {
    const styles = { pending: 'bg-warning/10 text-warning', confirmed: 'bg-info/10 text-info', processing: 'bg-purple-100 text-purple-600', delivered: 'bg-success/10 text-success', cancelled: 'bg-danger/10 text-danger' };
    return styles[status] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="space-y-10 page-transition">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">Order <span className="text-brand-600">Management</span></h1>
          <p className="mt-2 text-slate-500 font-medium uppercase text-xs tracking-[0.2em]">Sistem kawalan pesanan bersepadu</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} className="btn-modern bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
            <ArrowDownTrayIcon className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="premium-card p-6 border-none shadow-soft">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-black text-slate-400 uppercase mb-2 block">Status</label>
            <select className="input-modern" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value, page: 1})}>
              <option value="">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-black text-slate-400 uppercase mb-2 block">Bayaran</label>
            <select className="input-modern" value={filters.payment_status} onChange={e => setFilters({...filters, payment_status: e.target.value, page: 1})}>
              <option value="">Semua</option>
              <option value="paid">Sudah Bayar</option>
              <option value="pending">Belum Bayar</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => setFilters({ status: '', payment_status: '', page: 1 })} className="w-full btn-modern bg-slate-50 text-slate-400">Reset</button>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="modern-table w-full">
          <thead>
            <tr><th>No. Pesanan</th><th>Pelanggan</th><th className="text-right">Jumlah</th><th className="text-center">Status</th><th>Tarikh</th><th className="text-right">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? <tr><td colSpan="6" className="py-20 text-center"><div className="spinner mx-auto"></div></td></tr> :
              data?.data?.map(order => (
                <tr key={order.id}>
                  <td><p className="text-sm font-black text-slate-900">#{order.order_number}</p></td>
                  <td><p className="text-sm font-bold text-slate-700">{order.customer_name}</p></td>
                  <td className="text-right text-sm font-black text-brand-600">RM {parseFloat(order.total).toFixed(2)}</td>
                  <td className="text-center"><span className={`status-badge text-[11px] ${getStatusStyle(order.status)}`}>{order.status}</span></td>
                  <td className="text-sm text-slate-500 font-bold">{format(new Date(order.created_at), 'dd MMM')}</td>
                  <td className="text-right"><Link to={`/orders/${order.id}`} className="text-brand-600 font-black text-xs uppercase">Detail</Link></td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
