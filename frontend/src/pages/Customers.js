import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function Customers() {
  const [search, setSearch] = useState('');
  const [page] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    full_name: '', email: '', phone: '', address: '', city: '', state: '', postal_code: ''
  });

  const { data, isLoading } = useQuery(['customers', search, page], async () => {
    const res = await axios.get(`/api/customers?search=${search}&page=${page}&limit=20`);
    return res.data;
  });

  const addCustomerMutation = useMutation(async (data) => {
    return await axios.post('/api/customers', data);
  }, {
    onSuccess: () => {
      toast.success('Pelanggan berjaya didaftar!');
      setIsModalOpen(false);
      setFormData({ full_name: '', email: '', phone: '', address: '', city: '', state: '', postal_code: '' });
      queryClient.invalidateQueries('customers');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal mendaftar pelanggan')
  });

  return (
    <div className="space-y-10 page-transition">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">Customer <span className="text-brand-600">Database</span></h1>
          <p className="mt-2 text-slate-500 font-medium uppercase text-xs tracking-[0.2em]">Pangkalan data pelanggan sistem</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-modern btn-modern-primary">
          <PlusIcon className="h-4 w-4" /> Daftar Pelanggan
        </button>
      </div>

      <div className="premium-card p-4 border-none shadow-soft">
        <div className="relative w-full">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" className="input-modern pl-11" placeholder="Cari pelanggan..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-container">
        <table className="modern-table w-full">
          <thead>
            <tr>
              <th>Nama & Emel</th>
              <th>No. Telefon</th>
              <th>Status Belian</th>
              <th className="text-right">Jumlah Belanja</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? <tr><td colSpan="4" className="py-20 text-center"><div className="spinner mx-auto"></div></td></tr> :
              data?.data?.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-all">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs">{c.full_name.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{c.full_name}</p>
                        <p className="text-xs text-slate-400 font-bold">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-sm font-bold text-slate-600">{c.phone}</td>
                  <td>
                    <span className="status-badge bg-brand-50 text-brand-600 text-[11px]">{c.customer_type}</span>
                  </td>
                  <td className="text-right text-sm font-black text-slate-900">RM {parseFloat(c.total_spent).toFixed(2)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* Modal Add Customer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-premium overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-900 text-white">
              <h2 className="text-xl font-black italic tracking-tighter uppercase">Daftar Pelanggan</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); addCustomerMutation.mutate(formData); }} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-black text-slate-400 uppercase mb-1 block">Nama Penuh</label>
                  <input type="text" className="input-modern" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-black text-slate-400 uppercase mb-1 block">Emel</label>
                    <input type="email" className="input-modern" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                  </div>
                  <div>
                    <label className="text-sm font-black text-slate-400 uppercase mb-1 block">No. Telefon</label>
                    <input type="text" className="input-modern" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-black text-slate-400 uppercase mb-1 block">Alamat Penghantaran</label>
                  <textarea className="input-modern h-20 resize-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required></textarea>
                </div>
              </div>
              <button type="submit" disabled={addCustomerMutation.isLoading} className="w-full btn-modern btn-modern-primary py-4 uppercase text-sm font-black tracking-[0.2em]">Register Customer</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
