import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { 
  ArrowLeftIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export default function OrderDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState('');

  const { data: order, isLoading } = useQuery(['order', id], async () => {
    const res = await api.get(`/orders/${id}`);
    return res.data.data;
  });

  const updateStatusMutation = useMutation(async ({ status, type }) => {
    const endpoint = type === 'order' ? `/orders/${id}/status` : `/orders/${id}/payment`;
    const payload = type === 'order' ? { status } : { payment_status: status };
    await api.patch(endpoint, payload);
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries(['order', id]);
      queryClient.invalidateQueries('commission-transactions');
      queryClient.invalidateQueries('commission-summary');
      queryClient.invalidateQueries('dashboard-stats');
      toast.success('Status dikemaskini!');
      setSelectedStatus('');
    }
  });

  if (isLoading) return <div className="flex items-center justify-center h-[60vh]"><div className="spinner"></div></div>;
  if (!order) return <div className="text-center py-12 text-slate-500">Pesanan tidak dijumpai</div>;

  const getStatusStyle = (status) => {
    const styles = { pending: 'bg-warning/10 text-warning', confirmed: 'bg-info/10 text-info', processing: 'bg-purple-100 text-purple-600', delivered: 'bg-success/10 text-success' };
    return styles[status] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="space-y-10 page-transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/orders" className="p-2 hover:bg-slate-50 rounded-xl"><ArrowLeftIcon className="h-5 w-5 text-slate-400" /></Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Order <span className="text-brand-600">#{order.order_number}</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Dibuat pada {format(new Date(order.created_at), 'dd MMM yyyy, HH:mm')}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <span className={`status-badge ${getStatusStyle(order.status)}`}>{order.status}</span>
          <span className={`status-badge ${order.payment_status === 'paid' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>{order.payment_status}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Order Items */}
          <div className="premium-card p-0 border-none shadow-soft overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/30 font-black text-slate-900 uppercase text-xs tracking-widest">Senarai Item</div>
            <div className="divide-y divide-slate-50">
              {order.items?.map((item, i) => (
                <div key={i} className="p-6 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-black text-slate-900">{item.product_name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">SKU: {item.sku} • RM{item.price} x {item.quantity}</p>
                  </div>
                  <p className="text-sm font-black text-brand-600">RM{parseFloat(item.subtotal).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="p-6 bg-slate-50 space-y-3">
              <div className="flex justify-between text-sm font-bold text-slate-600">
                <span>Subtotal</span>
                <span>RM{parseFloat(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-600">
                <span>Tax (6%)</span>
                <span>RM{parseFloat(order.tax).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-black text-slate-900 pt-3 border-t border-slate-100">
                <span>JUMLAH KESELURUHAN</span>
                <span className="text-brand-600 text-2xl tracking-tighter">RM{parseFloat(order.total).toFixed(2)}</span>
              </div>
              {order.items?.reduce((sum, item) => sum + parseFloat(item.profit || 0), 0) > 0 && (
                <div className="flex justify-between text-base font-black text-purple-600 pt-3 border-t border-purple-100 bg-purple-50/50 -mx-6 px-6 py-3 mt-3">
                  <span className="flex items-center gap-2">
                    <ChartBarIcon className="h-5 w-5" /> GROSS PROFIT
                  </span>
                  <span>RM{order.items?.reduce((sum, item) => sum + parseFloat(item.profit || 0), 0).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* NEW: Order Timeline (Audit Trail) */}
          <div className="premium-card p-8 border-none shadow-soft">
            <div className="flex items-center gap-3 mb-8">
              <ShieldCheckIcon className="h-6 w-6 text-brand-600" />
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Order Audit Trail</h3>
            </div>
            <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              <div className="relative pl-8">
                <div className="absolute left-0 top-1 h-6 w-6 rounded-full bg-brand-600 border-4 border-brand-50 flex items-center justify-center z-10"></div>
                <p className="text-xs font-black text-slate-900 uppercase">Order Created</p>
                <p className="text-sm text-slate-500 font-medium">Sistem menerima pesanan dari {order.channel_name}.</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">{format(new Date(order.created_at), 'dd MMM yyyy, HH:mm')}</p>
              </div>
              <div className="relative pl-8">
                <div className="absolute left-0 top-1 h-6 w-6 rounded-full bg-slate-200 border-4 border-white z-10"></div>
                <p className="text-xs font-black text-slate-900 uppercase">Current Status: {order.status}</p>
                <p className="text-sm text-slate-500 font-medium">Status pesanan terkini direkodkan sebagai {order.status}.</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">Sistem Log: OK</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="premium-card p-6 border-none shadow-soft space-y-6">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Tindakan Cepat</h3>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Update Order Status</label>
              <select className="input-modern mb-3" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
                <option value="">Pilih status...</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
              </select>
              <button onClick={() => updateStatusMutation.mutate({ status: selectedStatus, type: 'order' })} disabled={!selectedStatus} className="w-full btn-modern bg-slate-900 text-white hover:bg-brand-600 transition-all">Sahkan Status</button>
            </div>
            <div className="pt-6 border-t border-slate-50">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Update Payment</label>
              <button onClick={() => updateStatusMutation.mutate({ status: 'paid', type: 'payment' })} className="w-full btn-modern btn-modern-primary">Tanda Sebagai Dibayar</button>
            </div>
          </div>

          <div className="premium-card p-6 border-none shadow-soft">
            <div className="flex items-center gap-3 mb-4">
              <UserCircleIcon className="h-6 w-6 text-brand-600" />
              <h3 className="text-lg font-black text-slate-900">Pelanggan</h3>
            </div>
            <p className="text-sm font-black text-slate-900">{order.customer_name}</p>
            <p className="text-xs text-slate-500 font-medium">{order.customer_email}</p>
            <div className="mt-4 p-4 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Alamat</p>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">{order.shipping_address}, {order.shipping_city}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
