import 'dotenv/config';

import express from 'express';
import multer from 'multer';
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
import notificationRoutes from './routes/notifications';
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
app.use(express.json({ limit: '1mb' }));
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
app.use('/api/notifications', notificationRoutes);

// Базовий роут для перевірки
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SADOK Server is running' });
});

app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      message: error.code === 'LIMIT_FILE_SIZE'
        ? 'Файл перевищує дозволений розмір'
        : 'Помилка завантаження файлу',
    });
  }

  if (typeof error === 'object' && error !== null && 'type' in error) {
    if (error.type === 'entity.too.large') {
      return res.status(413).json({ message: 'Запит перевищує дозволений розмір' });
    }
    if (error instanceof SyntaxError && error.type === 'entity.parse.failed') {
      return res.status(400).json({ message: 'Некоректний формат JSON' });
    }
  }

  if (error) {
    console.error('[Unhandled request error]', error);
    return res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }

  next();
});

// Socket.io логіка
setupSocket(io);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startBackupScheduler();
});
