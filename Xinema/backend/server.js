const express = require('express');
const cors = require('cors');
const fileRoutes = require('./routes/fileRoutes');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Register routes
app.use('/api', fileRoutes);

// Test root
app.get('/', (req, res) => res.send('Backend is running'));

// Debug: Log all incoming requests
app.use((req, res, next) => {
  console.log(`📡 Incoming request: ${req.method} ${req.path}`);
  next();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`🌐 Server accessible from network on port ${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /api/files`);
  console.log(`   GET  /api/video/:character/:filename`);
  console.log(`   GET  /api/thumbnail/:character/:filename`);
  console.log(`   GET  /api/duration/:character/:filename`);
  console.log(`   POST /api/prerender`);
  console.log(`   POST /api/extract-frame`);
  console.log(`   GET  /api/frame/:character/:filename/:frameNumber`);
  console.log(`   GET  /api/frame-direct/:character/:filename/:frameNumber`);
  console.log(`   GET  /api/test`);
  console.log(`\n💡 To access from another computer, use: http://<your-ip>:${PORT}`);
});
