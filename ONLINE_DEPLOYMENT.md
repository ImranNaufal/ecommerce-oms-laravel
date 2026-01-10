# 🌍 Online Deployment Guide (Free Hosting)

Follow these steps to put your OMS project online for free!

## 1. Database (MySQL) - [Aiven](https://aiven.io/)
1. Create a free account at Aiven.
2. Create a **MySQL** instance (Free Plan).
3. Copy the Connection Details.
4. **Update your `.env`** locally with Aiven details and run the schema import to verify it works.

## 2. Backend (Node.js) - [Render](https://render.com/)
1. Create a "Web Service" on Render.
2. Connect your GitHub repo.
3. **Build Command**: `npm install`
4. **Start Command**: `node backend/server.js`
5. Add **Environment Variables** in Render Dashboard:
   - `DB_HOST`: (Aiven Host)
   - `DB_USER`: (Aiven User)
   - `DB_PASSWORD`: (Aiven Password)
   - `DB_NAME`: `defaultdb` (or your Aiven db name)
   - `DB_PORT`: `24733` (Aiven default port)
   - `JWT_SECRET`: (Your secret)
   - `CLIENT_URL`: (Your Vercel URL - add this after Step 3)

## 3. Frontend (React) - [Vercel](https://vercel.com/)
1. Import your GitHub repo to Vercel.
2. **Framework Preset**: Create React App.
3. **Root Directory**: `frontend`
4. **Environment Variables**:
   - `REACT_APP_API_URL`: (Your Render URL, e.g., `https://oms-backend.onrender.com`)
5. Deploy.

---

## 📝 Important Code Update

To ensure the frontend knows which URL to use (Local vs Production), we need to update the API base configuration.

### Change in `frontend/src/context/AuthContext.js` and other pages:
Replace `axios.get('/api/...')` with a base instance.

I will prepare the code update for you now.
