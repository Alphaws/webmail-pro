import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import accountRoutes from './routes/accounts';
import mailRoutes from './routes/mail';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/mail', mailRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Webmail Pro API' });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Webmail Pro API is running on http://0.0.0.0:${PORT}`);
});
