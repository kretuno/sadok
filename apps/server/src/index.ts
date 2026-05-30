import 'dotenv/config';

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { db } from './db';
import attendanceRoutes from './routes/attendance';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import childrenRoutes from './routes/children';
import employeeRoutes from './routes/employees';
import invoiceRoutes from './routes/invoices';
import menuRoutes from './routes/menus';
import productRoutes from './routes/products';
import recipeRoutes from './routes/recipes';
import supplierRoutes from './routes/suppliers';
import medicalRoutes from './routes/medical';
import reportsRoutes from './routes/reports';
import systemRoutes from './routes/system';
import usersRoutes from './routes/users';
import psychologistRoutes from './routes/psychologist';
import utilitiesRoutes from './routes/utilities';
import { ensureDir, uploadsDir } from './paths';
import { setupSocket } from './socket';
import { startBackupScheduler } from './scheduler';

ensureDir(uploadsDir);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Логування запитів
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Маршрути
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/medical', medicalRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', systemRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/psychologist', psychologistRoutes);
app.use('/api/utilities', utilitiesRoutes);

// Базовий роут для перевірки
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SADOK Server is running' });
});

// Socket.io логіка
setupSocket(io);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startBackupScheduler();
});
