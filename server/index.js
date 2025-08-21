import express from 'express';
import serverRoutes from './routes/server.js';

const app = express();

app.use(express.json());
app.use('/api', serverRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

