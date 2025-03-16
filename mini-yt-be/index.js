const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const { connectToDatabase } = require('./db');
const ytRouter = require('./routes/miniyt');

// TODO
// 1. Setup the project correctly
// 2. do oauth
// 3. do yt apis
// 4. do frontend for the apis
// 5. deploy them

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/yt', ytRouter);

connectToDatabase().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log('Server running on port ', PORT));
});
