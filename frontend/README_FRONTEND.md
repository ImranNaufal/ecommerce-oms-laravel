# Frontend Documentation for Developers

## 📁 Project Structure

```
frontend/src/
├── components/
│   └── Layout.js            # Main layout with sidebar & header
├── context/
│   ├── AuthContext.js       # Authentication state management
│   └── CartContext.js       # Shopping cart state management
├── pages/
│   ├── Login.js             # Login page
│   ├── Dashboard.js         # Dashboard with analytics
│   ├── Products.js          # Product management + Cart
│   ├── Orders.js            # Order list with filters
│   ├── OrderDetail.js       # Order details & status update
│   ├── Commissions.js       # Commission tracking
│   ├── Customers.js         # Customer management
│   ├── Channels.js          # Sales channel integration
│   └── ApiLogs.js           # API monitoring
├── App.js                   # Routes & context providers
├── index.js                 # Entry point
└── index.css                # Global styles (Tailwind)
```

## 🎨 Design System

### Colors:
- **Primary (Brand):** `#0ea5e9` (Blue)
- **Success:** `#10b981` (Green)
- **Warning:** `#f59e0b` (Orange)
- **Danger:** `#ef4444` (Red)

### Typography:
- Headings: `font-black` (900 weight)
- Body: `font-bold` or `font-medium`
- Small text: `text-xs` or `text-sm`

### Components:
- **Cards:** `.premium-card` (rounded-2xl, shadow-soft)
- **Buttons:** `.btn-modern` + `.btn-modern-primary`
- **Inputs:** `.input-modern` (rounded-xl, focus ring)
- **Badges:** `.status-badge` (rounded-full, uppercase)

## 🔗 State Management

### Context API:
1. **AuthContext** (`context/AuthContext.js`)
   - Manages: Login, logout, user state
   - Functions: `login()`, `logout()`, `register()`
   - Auto-checks token on mount

2. **CartContext** (`context/CartContext.js`)
   - Manages: Shopping cart items
   - Functions: `addToCart()`, `removeFromCart()`, `updateQuantity()`, `clearCart()`
   - Persists to localStorage

### React Query:
- Data fetching & caching
- Auto-refresh on mutations
- `queryClient.invalidateQueries()` for real-time updates

## 📱 Key Pages Explained

### Dashboard.js
**Features:**
- 4 stat cards (dynamic based on role)
- Interactive sales chart dengan zoom/pan
- Recent activities list
- System alerts (Action Center)

**API Calls:**
- `/api/dashboard/stats` - Statistics
- `/api/dashboard/sales-chart` - Chart data (Admin only)
- `/api/dashboard/activities` - Recent orders
- `/api/alerts` - System alerts

### Products.js
**Features:**
- Product grid with search & pagination
- Add/Edit product modal (Auto-SKU generation)
- Delete product with confirmation
- Shopping cart slide-over
- **Full checkout flow** → Creates order + Deducts inventory

**Critical Functions:**
- `handleCheckout()` - Sends cart data to backend
- `saveProductMutation` - Create/Update product
- `deleteProductMutation` - Delete with safety check

### Orders.js & OrderDetail.js
**Features:**
- Order list with status/payment filters
- Export to CSV (Finance report)
- Order detail view
- **Update order status** - Dropdown with real-time update
- **Update payment status** - Triggers commission approval
- Audit trail timeline

### Commissions.js
**Features:**
- Summary cards (Pending/Approved/Paid)
- Transaction list
- Leaderboard (Top performers)
- **Admin approval** - Button untuk approve commissions

## 🔌 API Integration Patterns

### Standard GET Request:
```javascript
const { data } = useQuery('key', async () => {
  const res = await axios.get('/api/endpoint');
  return res.data.data;
});
```

### Mutation (POST/PUT/DELETE):
```javascript
const mutation = useMutation(async (data) => {
  return await axios.post('/api/endpoint', data);
}, {
  onSuccess: () => {
    toast.success('Success!');
    queryClient.invalidateQueries('key'); // Refresh data
  },
  onError: (err) => {
    toast.error(err.response?.data?.message || 'Failed');
  }
});
```

### Protected Requests:
- Token automatically included via `axios.defaults.headers.common['Authorization']`
- Set in `AuthContext.js` after login

## 🎯 How to Add New Page

1. Create file in `frontend/src/pages/NewPage.js`
2. Import in `App.js`
3. Add route: `<Route path="/new" element={<NewPage />} />`
4. Add to navigation in `Layout.js`
5. Set role restrictions in navigation array

## 🧪 How to Test

### Manual Test:
1. Start servers: `npm run dev`
2. Open http://localhost:3000
3. Login: admin@ecommerce.com / admin123
4. Navigate through features

### Check Console:
- F12 → Console tab
- Should have no errors (warnings OK)
- Network tab shows API calls

## 🔧 Common Issues & Solutions

### Issue: "Cannot read property of undefined"
**Solution:** Add optional chaining (`?.`) and fallback values
```javascript
data?.orders?.total || 0
```

### Issue: State not updating after mutation
**Solution:** Invalidate React Query cache
```javascript
queryClient.invalidateQueries('query-key');
```

### Issue: Form not submitting
**Solution:** Check `required` attributes and `onError` callback

---

**For API details, see `/backend/README_BACKEND.md` and `API_DOCUMENTATION.md`**
