import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import accountRoutes from './routes/accounts';
import mailRoutes from './routes/mail';
import { SocketService } from './services/socket';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

SocketService.init(io);

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/mail', mailRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Webmail Pro API' });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-account', (accountId) => {
    socket.join(`account-${accountId}`);
    console.log(`Socket ${socket.id} joined account-${accountId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

export { io };

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Webmail Pro API is running on http://0.0.0.0:${PORT}`);
});
