import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';

import loyaltyRoutes from './routes/loyalty';

const app = express();
app.use(express.json());

// CORS: wide-open in dev; tighten to your domain in prod if you want
app.use(cors({ origin: true }));

// ------------ API routes ------------
app.use('/api/loyalty', loyaltyRoutes);

// ------------ Serve React build ------------
const CLIENT_BUILD_PATH = path.join(__dirname, '..', '..', 'client', 'build');
// __dirname points to server/dist at runtime; ../../client/build => client build

app.use(express.static(CLIENT_BUILD_PATH));

// Catch-all: send React for any non-API request
app.get('*', (req, res) => {
  // Don’t hijack API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'Not found' });
  }
  res.sendFile(path.join(CLIENT_BUILD_PATH, 'index.html'));
});

// ------------ Start server ------------
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});




