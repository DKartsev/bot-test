import express from 'express';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

const adminDir = process.env.ADMIN_STATIC_DIR || path.join(__dirname, '../admin-out');
app.use('/admin', express.static(adminDir, { fallthrough: true }));

app.get('/health', (_req, res) => {
  res.send('ok');
});

app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
