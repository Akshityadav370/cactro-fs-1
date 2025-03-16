const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const { google } = require('googleapis');
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

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URL
);

app.get('/api/auth/url', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtube.readonly',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });

  res.json({ authUrl });
});

// Add this new route handler to your Express app
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Authorization code is missing');
  }

  try {
    // Exchange the code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Store tokens (in a production app, store these securely)
    // For now, we'll just set them in memory

    // Redirect to your frontend or render a success message
    res.send(`
        <h1>Authentication successful!</h1>
        <p>You can close this window and return to the application.</p>
        <script>
          // Optional: You can add code here to communicate back to your main window
          // if you're using this in a popup flow
        </script>
      `);
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/video/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;

    console.log(`Fetching details for video ID: ${videoId}`);
    console.log(
      `Using API key: ${
        process.env.YOUTUBE_API_KEY ? 'Available (masked)' : 'Not available'
      }`
    );

    const response = await youtube.videos.list({
      part: 'snippet,statistics',
      id: videoId,
    });

    if (response.data.items.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json(response.data.items[0]);
  } catch (error) {
    console.error('Error fetching video details:', error.message);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    res
      .status(500)
      .json({ error: 'Failed to fetch video details', details: error.message });
  }
});

app.put('/api/video/:videoId/title', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { title } = req.body;

    const authenticatedYoutube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    const response = await authenticatedYoutube.videos.update({
      part: 'snippet',
      requestBody: {
        id: videoId,
        snippet: {
          title,
        },
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error updating video title:', error);
    res.status(500).json({ error: 'Failed to update video title' });
  }
});

// Comment routes
app.post('/api/video/:videoId/comment', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { text } = req.body;

    const authenticatedYoutube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    const response = await authenticatedYoutube.commentThreads.insert({
      part: 'snippet',
      requestBody: {
        snippet: {
          videoId,
          topLevelComment: {
            snippet: {
              textOriginal: text,
            },
          },
        },
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

app.delete('/api/comment/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { videoId } = req.body;

    const authenticatedYoutube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    await authenticatedYoutube.comments.delete({
      id: commentId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Get comments for a video
app.get('/api/video/:videoId/comments', async (req, res) => {
  try {
    const { videoId } = req.params;
    console.log(`Fetching comments for video ID: ${videoId}`);

    const response = await youtube.commentThreads.list({
      part: 'snippet',
      videoId,
      maxResults: 100,
    });

    console.log(`Found ${response.data.items?.length || 0} comments`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching comments:', error.message);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    res
      .status(500)
      .json({ error: 'Failed to fetch comments', details: error.message });
  }
});

connectToDatabase().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log('Server running on port ', PORT));
});
