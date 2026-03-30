import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import apiRoutes from './routes/api.js';
import ratingsRoutes from './routes/ratings.js';
import requestLogger from './middleware/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3747;
const BASE_PATH = process.env.BASE_PATH || '/';

app.use(express.json());

// API routes with logging
app.use(`${BASE_PATH}api/search`.replace('//', '/'), requestLogger, apiRoutes);
app.use(`${BASE_PATH}api/ratings`.replace('//', '/'), ratingsRoutes);

// Serve built frontend in production
const clientDist = join(__dirname, '..', 'client', 'dist');
app.use(BASE_PATH, express.static(clientDist));
app.get(`${BASE_PATH}*`.replace('//', '/'), (req, res) => {
  res.sendFile(join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}${BASE_PATH}`);
});
