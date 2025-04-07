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
const adminRoutes = require('./routes/admin.routes');
const fundraisingRoutes = require('./routes/fundraising.routes');

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
  connectTimeout: 30000,
  pingTimeout: 60000, // Tăng timeout để tránh ngắt kết nối sớm
  pingInterval: 25000 // Tăng tần suất ping
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

// Serve ADMIN files directly - no authentication required
app.use('/admin', express.static(path.join(__dirname, '../../ADMIN')));

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
    
    // Thay đổi: Xử lý nhiều kết nối từ cùng một người dùng (nhiều tab/thiết bị)
    // Lưu socket ID cho user ID trong một Map có cấu trúc userId => Set của socketIds
    if (!global.userSocketsMap) {
      global.userSocketsMap = new Map();
    }
    
    if (!global.userSocketsMap.has(userId)) {
      global.userSocketsMap.set(userId, new Set());
    }
    
    // Thêm socket ID mới vào Set
    global.userSocketsMap.get(userId).add(socket.id);
    
    // Lưu userID trong socket để dễ dàng tìm kiếm khi disconnect
    socket.userId = userId;
    
    // Vẫn giữ lại cách lưu trữ cũ để tương thích với mã cũ
    connectedUsers.set(userId, socket.id);
    
    console.log('Connected users now:', Array.from(connectedUsers.entries()));
    console.log('User sockets map:', Array.from(global.userSocketsMap.entries())
      .map(([uid, sockets]) => `${uid}: [${Array.from(sockets).join(', ')}]`).join('; '));
  });
  
  // Xử lý ping từ client để giữ kết nối
  socket.on('ping', (data) => {
    // Gửi pong response với timestamp để client tính độ trễ
    socket.emit('pong', { timestamp: data.timestamp });
  });
  
  // Handle messages - xử lý sự kiện sendMessage
  socket.on('sendMessage', (data) => {
    const { recipientId, message } = data;
    console.log('Received sendMessage event:', data);
    
    if (!recipientId) {
      console.error('Missing recipientId in sendMessage data');
      return;
    }
    
    // In ra thông tin debug để kiểm tra socket
    console.log('-------------- SOCKET INFO ---------------');
    console.log('Sender ID:', message.senderId || 'Unknown');
    console.log('Recipient ID:', recipientId);
    
    // Thay đổi: Lấy tất cả socket IDs của người nhận
    const recipientSocketIds = global.userSocketsMap.get(recipientId) || new Set();
    console.log('Recipient socket IDs:', Array.from(recipientSocketIds));
    
    if (recipientSocketIds.size > 0) {
      // Gửi tin nhắn đến tất cả các socket của người nhận
      recipientSocketIds.forEach(socketId => {
        console.log(`Emitting message to socket ${socketId} for user ${recipientId}`);
        io.to(socketId).emit('receiveMessage', data);
      });
      console.log(`Socket message sent to ${recipientSocketIds.size} connections of recipient`);
    } else {
      console.log(`Recipient ${recipientId} is not connected`);
    }
    console.log('----------------------------------------');
    
    // Thêm xác nhận gửi lại cho sender
    socket.emit('messageSent', { success: true, message: 'Message sent', data });
  });
  
  // Handle notifications
  socket.on('sendNotification', (data) => {
    const { recipientId, notification } = data;
    
    if (!recipientId) {
      console.error('Missing recipientId in sendNotification data');
      return;
    }
    
    // Thay đổi: Gửi thông báo đến tất cả socket của người nhận
    const recipientSocketIds = global.userSocketsMap.get(recipientId) || new Set();
    
    if (recipientSocketIds.size > 0) {
      recipientSocketIds.forEach(socketId => {
        console.log(`Sending notification to ${recipientId} via socket ${socketId}`);
        io.to(socketId).emit('receiveNotification', notification);
      });
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    // Thay đổi: Xử lý ngắt kết nối bằng cách chỉ xóa socket hiện tại
    const userId = socket.userId;
    if (userId) {
      // Xóa socket ID khỏi Set của người dùng
      if (global.userSocketsMap && global.userSocketsMap.has(userId)) {
        const userSockets = global.userSocketsMap.get(userId);
        userSockets.delete(socket.id);
        
        // Nếu không còn socket nào, xóa người dùng khỏi Map
        if (userSockets.size === 0) {
          global.userSocketsMap.delete(userId);
          // Đồng thời xóa khỏi connectedUsers cũ
          connectedUsers.delete(userId);
          console.log(`User ${userId} has no active connections left`);
        } else {
          // Cập nhật connectedUsers với socket ID mới nhất
          const lastSocketId = Array.from(userSockets).pop();
          connectedUsers.set(userId, lastSocketId);
          console.log(`User ${userId} still has ${userSockets.size} active connections`);
        }
      }
      
      console.log('Connected users after disconnect:', Array.from(connectedUsers.entries()));
      if (global.userSocketsMap) {
        console.log('User sockets map:', Array.from(global.userSocketsMap.entries())
          .map(([uid, sockets]) => `${uid}: [${Array.from(sockets).join(', ')}]`).join('; '));
      }
    }
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
app.use('/api/admin', adminRoutes);
app.use('/api/fundraising', fundraisingRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Redirect root to admin dashboard for convenience
app.get('/', (req, res) => {
  res.redirect('/admin/index.html');
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Admin dashboard available at http://localhost:${PORT}/admin/`);
}); 