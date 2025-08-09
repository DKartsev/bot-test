require('dotenv').config();
const { logger } = require('../utils/logger');
const app = require('./index');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});
