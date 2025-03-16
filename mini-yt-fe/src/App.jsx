import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'http://localhost:3000/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [videoId, setVideoId] = useState('');
  const [videoDetails, setVideoDetails] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newTitle, setNewTitle] = useState('');
  // const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if user is coming back from OAuth flow
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      handleAuthCode(code);
    }
  }, []);

  const handleAuthCode = async (code) => {
    try {
      await axios.post(`${API_BASE_URL}/auth/token`, { code });
      setIsAuthenticated(true);
      // Remove the code from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      setError('Authentication failed', error);
    }
  };

  const handleAuthenticate = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/url`);
      window.location.href = response.data.authUrl;
    } catch (error) {
      setError('Failed to generate auth URL', error);
    }
  };

  const fetchVideoDetails = async () => {
    if (!videoId) {
      setError('Please enter a video ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_BASE_URL}/video/${videoId}`);
      setVideoDetails(response.data);
      setNewTitle(response.data.snippet.title);
      fetchComments();
      // fetchLogs();
    } catch (error) {
      setError('Failed to fetch video details', error);
    } finally {
      setLoading(false);
      console.log('hi', loading);
    }
  };

  const fetchComments = async () => {
    if (!videoId) return;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/video/${videoId}/comments`
      );
      setComments(response.data.items || []);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  // const fetchLogs = async () => {
  //   try {
  //     const response = await axios.get(`${API_BASE_URL}/logs`);
  //     setLogs(response.data);
  //   } catch (error) {
  //     console.error('Failed to fetch logs:', error);
  //   }
  // };

  const handleUpdateTitle = async () => {
    if (!isAuthenticated) {
      setError('Please authenticate first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.put(`${API_BASE_URL}/video/${videoId}/title`, {
        title: newTitle,
      });
      fetchVideoDetails();
    } catch (error) {
      setError('Failed to update title', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!isAuthenticated) {
      setError('Please authenticate first');
      return;
    }

    if (!newComment.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post(`${API_BASE_URL}/video/${videoId}/comment`, {
        text: newComment,
      });
      setNewComment('');
      fetchComments();
      // fetchLogs();
    } catch (error) {
      setError('Failed to add comment', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!isAuthenticated) {
      setError('Please authenticate first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.delete(`${API_BASE_URL}/comment/${commentId}`, {
        data: { videoId },
      });
      fetchComments();
      // fetchLogs();
    } catch (error) {
      setError('Failed to delete comment', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='App'>
      <header className='App-header'>
        <h1>YouTube Mini-App</h1>
        {!isAuthenticated && (
          <button onClick={handleAuthenticate} className='auth-button'>
            Authenticate with YouTube
          </button>
        )}
        {isAuthenticated && <div className='auth-status'>✓ Authenticated</div>}
      </header>

      <main>
        <section className='video-section'>
          <h2>Video Details</h2>
          <div className='input-group'>
            <input
              type='text'
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
              placeholder='Enter YouTube Video ID'
            />
            <button onClick={fetchVideoDetails} disabled={loading}>
              {loading ? 'Loading...' : 'Fetch Video'}
            </button>
          </div>

          {error && <div className='error'>{error}</div>}

          {videoDetails && (
            <div className='video-details'>
              <h3>{videoDetails.snippet.title}</h3>
              <div className='video-player'>
                <iframe
                  width='560'
                  height='315'
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title='YouTube video player'
                  frameBorder='0'
                  allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                  allowFullScreen
                ></iframe>
              </div>
              <div className='video-info'>
                <p>{videoDetails.snippet.description}</p>
                <p>Views: {videoDetails.statistics.viewCount}</p>
                <p>Likes: {videoDetails.statistics.likeCount}</p>
              </div>

              <div className='update-title'>
                <h4>Update Title</h4>
                <div className='input-group'>
                  <input
                    type='text'
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder='New Title'
                  />
                  <button onClick={handleUpdateTitle} disabled={loading}>
                    Update
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {videoDetails && (
          <section className='comments-section'>
            <h2>Comments</h2>
            <div className='add-comment'>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder='Add a comment...'
                rows='3'
              ></textarea>
              <button onClick={handleAddComment} disabled={loading}>
                Post Comment
              </button>
            </div>

            <div className='comments-list'>
              {comments.length === 0 ? (
                <p>No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className='comment'>
                    <div className='comment-header'>
                      <img
                        src={
                          comment.snippet.topLevelComment.snippet
                            .authorProfileImageUrl
                        }
                        alt='Avatar'
                        className='avatar'
                      />
                      <strong>
                        {
                          comment.snippet.topLevelComment.snippet
                            .authorDisplayName
                        }
                      </strong>
                      <span className='comment-date'>
                        {new Date(
                          comment.snippet.topLevelComment.snippet.publishedAt
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    <p>{comment.snippet.topLevelComment.snippet.textDisplay}</p>
                    {comment.snippet.topLevelComment.snippet.authorChannelId
                      .value === videoDetails.snippet.channelId && (
                      <button
                        onClick={() =>
                          handleDeleteComment(
                            comment.snippet.topLevelComment.id
                          )
                        }
                        className='delete-button'
                        disabled={loading}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* <section className='logs-section'>
          <h2>Event Logs</h2>
          <table className='logs-table'>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Video ID</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>{log.action}</td>
                  <td>{log.videoId}</td>
                  <td>{JSON.stringify(log.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section> */}
      </main>
    </div>
  );
}

export default App;
