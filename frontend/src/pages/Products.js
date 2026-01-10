import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../api';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import { validators } from '../utils/validators';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  ArchiveBoxIcon,
  ShoppingCartIcon,
  XMarkIcon,
  PencilSquareIcon,
  TrashIcon,
  PhotoIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

export default function Products() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const { addToCart, cart, clearCart, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, subtotal } = useCart();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '', price: '', cost_price: '', stock_quantity: '', category_id: 1, 
    low_stock_threshold: 5, description: '', image_url: ''
  });

  const { data, isLoading } = useQuery(['products', search, page], async () => {
    const res = await api.get(`/products?search=${search}&page=${page}&limit=20`);
    return res.data;
  });

  const { data: categories } = useQuery('categories', async () => {
    const res = await api.get('/products/categories/all');
    return res.data.data;
  });

  // Create/Update Product
  const saveProductMutation = useMutation(async (data) => {
    if (editingProduct) {
      return await api.put(`/products/${editingProduct.id}`, data);
    }
    return await api.post('/products', data);
  }, {
    onSuccess: (response) => {
      if (response.data.sku) {
        toast.success(`✅ Produk ditambah! SKU: ${response.data.sku}`);
      } else {
        toast.success('Produk dikemaskini!');
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      queryClient.invalidateQueries('products');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal menyimpan')
  });

  // Delete Product
  const deleteProductMutation = useMutation(async (id) => {
    return await api.delete(`/products/${id}`);
  }, {
    onSuccess: () => {
      toast.success('Produk dipadam!');
      queryClient.invalidateQueries('products');
    },
    onError: (err) => toast.error('Gagal memadam produk')
  });

  // Checkout - OPTIMIZED untuk response pantas
  const checkoutMutation = useMutation(async (orderData) => {
    const res = await api.post('/orders', orderData, { timeout: 5000 });
    return res.data;
  }, {
    onSuccess: (data) => {
      // Clear cart & close modal IMMEDIATELY (optimistic UI)
      clearCart();
      setIsCartOpen(false);
      
      // Show success
      toast.success(`🎉 Order ${data.orderNumber} created!`, { duration: 3000 });
      
      // Background refresh (user tidak perlu tunggu)
      setTimeout(() => {
        queryClient.invalidateQueries('products');
        queryClient.invalidateQueries('dashboard-stats');
        queryClient.invalidateQueries('orders');
      }, 100);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Checkout failed');
    }
  });

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({ name: '', price: '', cost_price: '', stock_quantity: '', category_id: 1, low_stock_threshold: 5, description: '', image_url: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({ ...product });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form before submit
    const errors = {};
    
    // Validate product name
    const nameError = validators.required(formData.name, 'Product name');
    if (nameError) errors.name = nameError;
    
    // Validate price
    const priceError = validators.price(formData.price, 'Selling price');
    if (priceError) errors.price = priceError;
    
    // Validate stock
    const stockError = validators.number(formData.stock_quantity, 'Stock quantity', 0);
    if (stockError) errors.stock_quantity = stockError;
    
    // Validate cost price (optional but must be valid number if provided)
    if (formData.cost_price && validators.number(formData.cost_price, 'Cost price', 0)) {
      errors.cost_price = validators.number(formData.cost_price, 'Cost price', 0);
    }
    
    // Validate image URL (optional but must be valid if provided)
    if (formData.image_url) {
      const urlError = validators.url(formData.image_url);
      if (urlError) errors.image_url = urlError;
    }
    
    // Check if price is higher than cost (business logic)
    if (formData.price && formData.cost_price) {
      if (parseFloat(formData.cost_price) >= parseFloat(formData.price)) {
        errors.cost_price = 'Cost price must be lower than selling price';
      }
    }
    
    setFormErrors(errors);
    
    // Only submit if no errors
    if (Object.keys(errors).length === 0) {
      saveProductMutation.mutate(formData);
    } else {
      toast.error('Please fix validation errors before saving');
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    /**
     * Manual Order Entry (Internal Use)
     * 
     * This is for staff/admin to create orders on behalf of customers
     * (e.g., phone orders, walk-in sales, B2B orders)
     * 
     * In production, implement customer selection dropdown
     * For demo/portfolio: Uses default customer (ID: 1) and main channel (ID: 1)
     */
    const orderData = {
      customer_id: 1,  // Default demo customer
      channel_id: 1,   // Main website channel
      items: cart.map(item => ({ 
        product_id: item.id, 
        quantity: item.quantity 
      })),
      shipping_address: "123 Jalan Ampang",
      shipping_city: "Kuala Lumpur",
      shipping_state: "WP Kuala Lumpur",
      shipping_postal_code: "50450",
      payment_method: "online_banking",
      discount: 0,
      shipping_fee: 0,
      notes: "Order dari Shopping Cart"
    };
    
    // Send order to backend
    checkoutMutation.mutate(orderData);
  };

  return (
    <div className="space-y-10 page-transition">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">Inventory <span className="text-brand-600">Master</span></h1>
          <p className="mt-2 text-slate-500 font-medium uppercase text-xs tracking-[0.2em]">Urus stok dan pesanan manual</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button onClick={openAddModal} className="btn-modern bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex-1">
            <PlusIcon className="h-4 w-4" /> Tambah Item
          </button>
          <button onClick={() => setIsCartOpen(true)} className="btn-modern btn-modern-primary relative flex-1">
            <ShoppingCartIcon className="h-4 w-4" /> Troli ({cart.length})
          </button>
        </div>
      </div>

      <div className="premium-card p-4 border-none shadow-soft">
        <div className="relative w-full">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" className="input-modern pl-11" placeholder="Cari SKU atau nama produk..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {isLoading ? <div className="py-20 text-center"><div className="spinner mx-auto"></div></div> : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data?.data?.map((product) => (
            <div key={product.id} className="group premium-card p-0 border-none shadow-soft overflow-hidden">
              <div className="relative h-44 bg-slate-50 flex items-center justify-center overflow-hidden">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <ArchiveBoxIcon className="h-12 w-12 text-slate-200" />
                )}
                <div className="absolute top-3 left-3 flex gap-2 z-10">
                  <span className={`status-badge bg-white border border-slate-100 shadow-sm ${product.stock_quantity <= product.low_stock_threshold ? 'text-warning' : 'text-success'}`}>
                    {product.stock_quantity} UNIT
                  </span>
                </div>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all flex gap-2 z-10">
                  <button onClick={() => openEditModal(product)} className="p-2 bg-white/90 backdrop-blur shadow-sm rounded-lg text-brand-600 hover:bg-brand-600 hover:text-white transition-all">
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button onClick={() => {if(window.confirm('Padam produk ini?')) deleteProductMutation.mutate(product.id)}} className="p-2 bg-white/90 backdrop-blur shadow-sm rounded-lg text-red-600 hover:bg-red-600 hover:text-white transition-all">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{product.category_name}</p>
                  {product.cost_price > 0 && (
                    <span className="text-xs font-black bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full border border-purple-100">
                      {(((product.price - product.cost_price) / product.price) * 100).toFixed(0)}% margin
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-black text-slate-900 truncate mb-4">{product.name}</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-black text-brand-600">RM{parseFloat(product.price).toFixed(2)}</p>
                    {product.cost_price > 0 && (
                      <p className="text-xs text-slate-400 font-bold">Cost: RM{parseFloat(product.cost_price).toFixed(2)}</p>
                    )}
                  </div>
                  <button onClick={() => addToCart(product)} disabled={product.stock_quantity === 0} className="h-9 w-9 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-brand-600 transition-all disabled:opacity-20">
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="btn-modern bg-white border border-slate-100 text-slate-600 text-sm px-6 disabled:opacity-20"
          >
            Sebelum
          </button>
          <span className="text-sm font-black text-slate-400">
            Halaman {page} / {data.pagination.pages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === data.pagination.pages}
            className="btn-modern bg-white border border-slate-100 text-slate-600 text-sm px-6 disabled:opacity-20"
          >
            Seterusnya
          </button>
        </div>
      )}

      {/* Modal Add/Edit Product - UPDATED dengan Image URL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-premium overflow-hidden animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-900 text-white sticky top-0 z-10">
              <h2 className="text-xl font-black italic tracking-tighter uppercase">{editingProduct ? 'Edit Product' : 'Tambah Produk'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-black text-slate-400 uppercase mb-1 block flex items-center gap-2">
                  <PhotoIcon className="h-3 w-3" /> Image URL (Unsplash/CDN)
                </label>
                <input 
                  type="url" 
                  className={`input-modern text-sm ${formErrors.image_url ? 'border-red-500 bg-red-50' : ''}`}
                  placeholder="https://images.unsplash.com/photo-xxx?w=500" 
                  value={formData.image_url} 
                  onChange={e => {
                    setFormData({...formData, image_url: e.target.value});
                    setFormErrors({...formErrors, image_url: null});
                  }}
                />
                {formErrors.image_url ? (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <ExclamationCircleIcon className="h-3 w-3" /> {formErrors.image_url}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">Example: https://images.unsplash.com/photo-xxx?w=500</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-black text-slate-400 uppercase mb-1 block">Product Name</label>
                  <input 
                    type="text" 
                    className={`input-modern ${formErrors.name ? 'border-red-500 bg-red-50' : ''}`}
                    value={formData.name} 
                    onChange={e => {
                      setFormData({...formData, name: e.target.value});
                      setFormErrors({...formErrors, name: null});
                    }} 
                  />
                  {formErrors.name && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3 w-3" /> {formErrors.name}
                    </p>
                  )}
                </div>
                {editingProduct && (
                  <div className="col-span-2">
                    <label className="text-sm font-black text-slate-400 uppercase mb-1 block">SKU (Auto-Generated)</label>
                    <input type="text" className="input-modern bg-slate-100" value={editingProduct.sku} disabled />
                  </div>
                )}
                {!editingProduct && (
                  <div className="col-span-2">
                    <p className="text-xs font-black text-brand-600 uppercase mb-1">✨ SKU akan di-generate automatik berdasarkan kategori</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-black text-slate-400 uppercase mb-1 block">Category</label>
                  <select className="input-modern" value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})}>
                    {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">Auto-generates SKU (e.g., ELEC-001)</p>
                </div>
                <div>
                  <label className="text-sm font-black text-slate-400 uppercase mb-1 block">Selling Price (RM)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className={`input-modern ${formErrors.price ? 'border-red-500 bg-red-50' : ''}`}
                    value={formData.price} 
                    onChange={e => {
                      setFormData({...formData, price: e.target.value});
                      setFormErrors({...formErrors, price: null});
                    }}
                  />
                  {formErrors.price && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3 w-3" /> {formErrors.price}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-black text-slate-400 uppercase mb-1 block">Cost Price (RM)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className={`input-modern ${formErrors.cost_price ? 'border-red-500 bg-red-50' : ''}`}
                    value={formData.cost_price} 
                    onChange={e => {
                      setFormData({...formData, cost_price: e.target.value});
                      setFormErrors({...formErrors, cost_price: null});
                    }}
                  />
                  {formErrors.cost_price && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3 w-3" /> {formErrors.cost_price}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-black text-slate-400 uppercase mb-1 block">Stock Quantity</label>
                  <input 
                    type="number" 
                    className={`input-modern ${formErrors.stock_quantity ? 'border-red-500 bg-red-50' : ''}`}
                    value={formData.stock_quantity} 
                    onChange={e => {
                      setFormData({...formData, stock_quantity: e.target.value});
                      setFormErrors({...formErrors, stock_quantity: null});
                    }}
                  />
                  {formErrors.stock_quantity && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3 w-3" /> {formErrors.stock_quantity}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-black text-slate-400 uppercase mb-1 block">Low Stock Alert</label>
                  <input 
                    type="number" 
                    className="input-modern" 
                    value={formData.low_stock_threshold} 
                    onChange={e => setFormData({...formData, low_stock_threshold: e.target.value})} 
                  />
                  <p className="text-xs text-slate-400 mt-1">Alert when stock falls below this number</p>
                </div>
              </div>
              <button type="submit" disabled={saveProductMutation.isLoading} className="w-full btn-modern btn-modern-primary py-4 mt-4 uppercase text-sm font-black tracking-[0.2em]">
                {saveProductMutation.isLoading ? 'Menyimpan...' : (editingProduct ? 'Simpan Perubahan' : 'Tambah Produk')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Cart Slide-over - FIXED CHECKOUT */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-md bg-white shadow-premium flex flex-col">
              <div className="p-6 bg-brand-600 text-white flex justify-between items-center">
                <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2"><ShoppingCartIcon className="h-6 w-6" /> Ringkasan Troli</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-white/10 rounded-lg"><XMarkIcon className="h-6 w-6" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <p className="text-center py-20 text-slate-400 font-bold uppercase text-sm tracking-widest">Troli Kosong</p>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="h-14 w-14 bg-white rounded-xl flex items-center justify-center border border-slate-100 overflow-hidden">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <ArchiveBoxIcon className="h-6 w-6 text-slate-200" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black text-slate-900">{item.name}</p>
                        <p className="text-xs text-brand-600 font-bold">RM{item.price} x {item.quantity}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="h-6 w-6 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-xs font-bold hover:bg-slate-100">-</button>
                          <span className="text-sm font-black text-slate-700">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)} 
                            disabled={item.quantity >= item.stock_quantity}
                            className="h-6 w-6 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-xs font-bold hover:bg-slate-100 disabled:opacity-20"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-danger"><XMarkIcon className="h-5 w-5" /></button>
                    </div>
                  ))
                )}
              </div>
              {cart.length > 0 && (
                <div className="p-6 border-t border-slate-50 bg-slate-50/50">
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between"><span>Subtotal:</span><span className="font-bold">RM{subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Tax (6%):</span><span className="font-bold">RM{(subtotal * 0.06).toFixed(2)}</span></div>
                    <div className="flex justify-between text-lg font-black border-t border-slate-200 pt-2">
                      <span>TOTAL:</span>
                      <span className="text-brand-600">RM{(subtotal * 1.06).toFixed(2)}</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleCheckout}
                    disabled={checkoutMutation.isLoading}
                    className="w-full btn-modern btn-modern-primary py-4 shadow-brand-200 uppercase text-sm font-black tracking-[0.2em] disabled:opacity-70"
                  >
                    {checkoutMutation.isLoading ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </span>
                    ) : 'Buat Pesanan Sekarang'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
