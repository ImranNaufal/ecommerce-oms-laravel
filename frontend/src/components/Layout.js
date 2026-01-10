import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  HomeIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  UsersIcon,
  CurrencyDollarIcon,
  RectangleStackIcon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  MagnifyingGlassIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Overview', href: '/', icon: HomeIcon, roles: ['admin', 'staff', 'affiliate'] },
  { name: 'Products', href: '/products', icon: ShoppingBagIcon, roles: ['admin', 'staff'] },
  { name: 'Order Management', href: '/orders', icon: ShoppingCartIcon, roles: ['admin', 'staff', 'affiliate'] },
  { name: 'Customers', href: '/customers', icon: UsersIcon, roles: ['admin', 'staff'] },
  { name: 'Commissions', href: '/commissions', icon: CurrencyDollarIcon, roles: ['admin', 'staff', 'affiliate'] },
  { name: 'Integrations', href: '/channels', icon: RectangleStackIcon, roles: ['admin'] },
  { name: 'System Logs', href: '/logs', icon: CommandLineIcon, roles: ['admin'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch Notifications (Real-time polling every 5 seconds)
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications?limit=5');
        const newUnreadCount = res.data.data.unread_count;
        
        // Trigger animation jika ada notification baru
        if (newUnreadCount > unreadCount) {
          // Shake animation untuk bell icon
          document.getElementById('notification-bell')?.classList.add('animate-bounce');
          setTimeout(() => {
            document.getElementById('notification-bell')?.classList.remove('animate-bounce');
          }, 1000);
        }
        
        setUnreadCount(newUnreadCount);
        setNotifications(res.data.data.notifications);
      } catch (err) {}
    };
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [unreadCount]);

  // Handle Search
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const res = await api.get(`/search?q=${searchQuery}`);
          setSearchResults(res.data.data);
        } catch (err) {} finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults(null);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const filteredNavigation = navigation.filter(item => item.roles.includes(user?.role));
  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  // Mark all notifications as read
  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark notifications as read');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:bg-white lg:border-r lg:border-slate-100">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center h-20 flex-shrink-0 px-8">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-200">
                <span className="text-white font-bold text-xl">O</span>
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">System<span className="text-brand-600">OMS</span></span>
            </div>
          </div>
          
          <nav className="flex-1 px-4 py-4 space-y-2">
            <div className="px-4 mb-2">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">Main Menu</p>
            </div>
            {filteredNavigation.map((item) => (
              <Link key={item.name} to={item.href} className={`nav-link ${isActive(item.href) ? 'nav-link-active' : 'nav-link-inactive'}`}>
                <item.icon className={`mr-3 h-6 w-6 ${isActive(item.href) ? 'text-white' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-50">
            <div className="flex items-center gap-3 px-4 mb-4">
              <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold border-2 border-white shadow-sm text-base">
                {user?.full_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{user?.full_name}</p>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{user?.role}</p>
              </div>
            </div>
            <button onClick={logout} className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-danger hover:bg-red-50 rounded-xl transition-all">
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="lg:pl-72 flex flex-col flex-1">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30 flex items-center justify-between px-8">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md w-full">
              <MagnifyingGlassIcon className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${isSearching ? 'text-brand-500 animate-pulse' : 'text-slate-400'}`} />
              <input 
                type="text" 
                placeholder="Search orders, products..." 
                className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-2.5 text-base focus:ring-2 focus:ring-brand-500/20 transition-all outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchResults && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-premium border border-slate-100 overflow-hidden animate-slide-up">
                  <div className="p-4 max-h-96 overflow-y-auto">
                    {searchResults.products.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Products</p>
                        {searchResults.products.map(p => (
                          <div key={p.id} onClick={() => {navigate('/products'); setSearchQuery('')}} className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer flex justify-between items-center">
                            <span className="text-base font-bold text-slate-700">{p.name}</span>
                            <span className="text-sm text-brand-600">RM{p.price}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchResults.orders.length > 0 && (
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Orders</p>
                        {searchResults.orders.map(o => (
                          <div key={o.id} onClick={() => {navigate(`/orders/${o.id}`); setSearchQuery('')}} className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer flex justify-between items-center">
                            <span className="text-base font-bold text-slate-700">#{o.order_number}</span>
                            <span className="text-xs font-black uppercase tracking-tighter bg-brand-50 text-brand-600 px-2 py-0.5 rounded">{o.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                id="notification-bell"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications && unreadCount > 0) {
                    markAllRead();
                  }
                }}
                className="p-2.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all relative"
              >
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && <span className="absolute top-2 right-2 h-4 w-4 bg-danger text-white text-[10px] flex items-center justify-center font-bold rounded-full border-2 border-white animate-pulse">{unreadCount}</span>}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-premium border border-slate-100 overflow-hidden animate-slide-up">
                  <div className="p-4 border-b border-slate-50 flex justify-between items-center">
                    <span className="text-base font-black text-slate-900">Notifications</span>
                    <button onClick={() => setShowNotifications(false)} className="text-slate-400"><XMarkIcon className="h-5 w-5" /></button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map(n => (
                      <div key={n.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-all">
                        <p className="text-sm font-black text-slate-900">{n.title}</p>
                        <p className="text-sm text-slate-500 mt-1">{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="h-8 w-px bg-slate-100 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900">{user?.full_name}</p>
                <p className="text-xs text-slate-500 font-medium">Active Session</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-100 font-black text-lg">{user?.full_name?.charAt(0)}</div>
            </div>
          </div>
        </header>
        <main className="p-8"><Outlet /></main>
      </div>
    </div>
  );
}
