const express = require('express');
const cors = require('cors');
const http = require('http');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// CORS configuration
const corsOptions = {
  origin: '*', // Or specific domains like ['http://localhost:4200']
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const llamaRoutes = require('./routes/llama.routes');

// PORT
const PORT = process.env.PORT || 5000;

// API Routes
app.use('/api/llama', llamaRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Llama API Server is running' });
});

// Start server
server.listen(PORT, () => {
  console.log(`Llama API Server running on port ${PORT}`);
  console.log(`Llama API available at http://localhost:${PORT}/api/llama`);
}); 