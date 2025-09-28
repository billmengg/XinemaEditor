const express = require('express');
const cors = require('cors');
const fileRoutes = require('./routes/fileRoutes');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Register routes
app.use('/api/files', fileRoutes);

// Test root
app.get('/', (req, res) => res.send('Backend is running'));

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
