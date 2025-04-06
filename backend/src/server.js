require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const friendsRoutes = require('./routes/friends.routes');
const postsRoutes = require('./routes/posts.routes');
const searchRoutes = require('./routes/search.routes');
const messagesRoutes = require('./routes/messages.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const blockRoutes = require('./routes/block.routes');
const reportsRoutes = require('./routes/reports.routes');
const userReportsRoutes = require('./routes/user-reports.routes');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Cấu hình CORS
const corsOptions = {
  origin: '*', // Hoặc các domain cụ thể ['http://localhost:4200', 'http://yourdomain.com']
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

// Cấu hình Socket.IO với CORS
const io = socketIo(server, {
  cors: {
    origin: '*', // Hoặc các domain cụ thể
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  connectTimeout: 30000
});

// Make Socket.IO instances globally available for controllers
global.io = io;
global.connectedUsers = new Map();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/assets', express.static(path.join(__dirname, '../../src/assets')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Configure Socket.IO
const connectedUsers = global.connectedUsers;

// Make io accessible to routes - IMPORTANT: this needs to be done before requiring the routes
app.set('io', io);
app.set('connectedUsers', connectedUsers);

// Debug middleware cho Socket.IO
io.use((socket, next) => {
  console.log('New socket connection attempt:', socket.id);
  console.log('Socket handshake query:', socket.handshake.query);
  console.log('Socket handshake headers:', socket.handshake.headers.origin);
  next();
});

io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);
  
  // User authentication and mapping socket to user
  socket.on('authenticate', (userId) => {
    console.log(`User ${userId} authenticated on socket ${socket.id}`);
    
    // Lưu socket ID cho user ID (cho phép nhiều kết nối từ cùng một user)
    // Đây là cách xử lý khi user mở nhiều tab/thiết bị
    connectedUsers.set(userId, socket.id);
    
    console.log('Connected users now:', Array.from(connectedUsers.entries()));
  });
  
  // Handle messages - khôi phục lại xử lý sự kiện sendMessage
  socket.on('sendMessage', (data) => {
    const { recipientId, message } = data;
    console.log('Received sendMessage event:', data);
    
    if (!recipientId) {
      console.error('Missing recipientId in sendMessage data');
      return;
    }
    
    const recipientSocketId = connectedUsers.get(recipientId);
    console.log(`Looking for recipient ${recipientId}, socket ID: ${recipientSocketId}`);
    console.log('Current connected users:', Array.from(connectedUsers.entries()));
    
    if (recipientSocketId) {
      console.log(`Sending message to ${recipientId} via socket ${recipientSocketId}`);
      // Gửi tin nhắn tới người nhận
      io.to(recipientSocketId).emit('receiveMessage', data);
    } else {
      console.log(`Recipient ${recipientId} is not connected`);
    }
  });
  
  // Handle notifications
  socket.on('sendNotification', (data) => {
    const { recipientId, notification } = data;
    
    if (!recipientId) {
      console.error('Missing recipientId in sendNotification data');
      return;
    }
    
    const recipientSocketId = connectedUsers.get(recipientId);
    
    if (recipientSocketId) {
      console.log(`Sending notification to ${recipientId} via socket ${recipientSocketId}`);
      io.to(recipientSocketId).emit('receiveNotification', notification);
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    // Remove socket from connectedUsers
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        console.log(`User ${userId} disconnected`);
        connectedUsers.delete(userId);
        break;
      }
    }
    console.log('Connected users after disconnect:', Array.from(connectedUsers.entries()));
  });

  // Thêm xử lý lỗi cho socket
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/block', blockRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/user-reports', userReportsRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 