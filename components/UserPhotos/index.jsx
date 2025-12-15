import React, { useState, useEffect } from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  Card,
  CardHeader,
  CardContent,
  CardMedia,
  Typography,
  Button,
  TextField,
  MobileStepper,
  IconButton,
} from "@mui/material";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from "react-router-dom";
import DeleteIcon from '@mui/icons-material/Delete';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { io } from "socket.io-client";

import { fetchPhotosOfUser, addComment, deleteComment, deletePhoto, likePhoto } from '../../lib/api';
import useStore from '../../lib/store';

import './styles.css';

function UserPhotos({ userId, photoIndexParam }) {
  const navigate = useNavigate();
  const advancedEnabled = useStore((state) => state.advancedEnabled);
  const loggedInUser = useStore((state) => state.loggedInUser);
  const queryClient = useQueryClient();
  const [newComments, setNewComments] = useState({});

  const { data: photos, isPending, isError } = useQuery({
    queryKey: ['photos', userId],
    queryFn: () => fetchPhotosOfUser(userId),
    enabled: !!userId,
  });

  // Socket.io Connection
  useEffect(() => {
    const socket = io("http://localhost:3001");

    socket.on("like_update", ({ photo_id, likes }) => {
      // Optimistically update the cache for all users viewing this photo
      queryClient.setQueryData(['photos', userId], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(p => {
          if (p._id === photo_id) {
            return { ...p, likes: likes };
          }
          return p;
        });
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, queryClient]);


  const addCommentMutation = useMutation({
    mutationFn: ({ photoId, comment }) => addComment(photoId, comment),
    onSuccess: () => {
      queryClient.invalidateQueries(['photos', userId]);
      queryClient.invalidateQueries(['comments', userId]);
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: ({ photoId, commentId }) => deleteComment(photoId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries(['photos', userId]);
      queryClient.invalidateQueries(['comments', userId]);
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: ({ photoId }) => deletePhoto(photoId),
    onSuccess: () => {
      queryClient.invalidateQueries(['photos', userId]);
    },
  });

  const likeMutation = useMutation({
    mutationFn: (photoId) => likePhoto(photoId),
    // onSuccess is handled by socket event usually, but we can also invalidate to be safe
    // or just let the socket event do the UI update.
    onError: (err) => {
      console.error("Like failed", err);
    }
  });

  const handleDeleteComment = (photoId, commentId) => {
    // eslint-disable-next-line no-alert
    if (window.confirm("Are you sure you want to delete this comment?")) {
      deleteCommentMutation.mutate({ photoId, commentId });
    }
  };

  const handleDeletePhoto = (photoId) => {
    // eslint-disable-next-line no-alert
    if (window.confirm("Are you sure you want to delete this photo?")) {
      deletePhotoMutation.mutate({ photoId });
    }
  };

  const handleLike = (photoId) => {
    likeMutation.mutate(photoId);
  };

  const handleCommentChange = (photoId, value) => {
    setNewComments((prev) => ({ ...prev, [photoId]: value }));
  };

  const handleAddComment = (photoId) => {
    const comment = newComments[photoId];
    if (!comment || !comment.trim()) return;

    addCommentMutation.mutate({ photoId, comment }, {
      onSuccess: () => {
        setNewComments((prev) => ({ ...prev, [photoId]: '' }));
      },
      onError: (err) => {
        console.error("Failed to add comment:", err);
        // Optionally show an error message to the user
      }
    });
  };

  const isLiked = (photo) => {
    return (photo.likes || []).includes(loggedInUser?._id);
  };

  if (isPending) {
    return <Typography variant="body1">Loading photos...</Typography>;
  }

  if (isError) {
    return (
      <Typography variant="body1">
        Error loading photos.
      </Typography>
    );
  }

  if (!photos || photos.length === 0) {
    return (
      <Typography variant="body1">
        This user has no photos.
      </Typography>
    );
  }

  // Advanced Features: Stepper View
  if (advancedEnabled) {
    const maxSteps = photos.length;
    // Parse photoIndexParam to integer, default to 0
    let activeStep = parseInt(photoIndexParam, 10);
    if (Number.isNaN(activeStep) || activeStep < 0 || activeStep >= maxSteps) {
      activeStep = 0;
    }

    const handleNext = () => {
      const nextStep = activeStep + 1;
      if (nextStep < maxSteps) {
        navigate(`/photos/${userId}/${nextStep}`);
      }
    };

    const handleBack = () => {
      const prevStep = activeStep - 1;
      if (prevStep >= 0) {
        navigate(`/photos/${userId}/${prevStep}`);
      }
    };

    const photo = photos[activeStep];

    if (!photo) return <Typography>Photo not found...</Typography>;

    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <Card>
          <CardHeader
            title={photo.file_name}
            subheader={photo.date_time}
            action={
              loggedInUser && loggedInUser._id === photo.user_id && (
                <IconButton onClick={() => handleDeletePhoto(photo._id)}>
                  <DeleteIcon />
                </IconButton>
              )
            }
          />
          <CardMedia
            component="img"
            image={`/images/${photo.file_name}`}
            alt={photo.file_name}
          />
          <CardContent>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <IconButton onClick={() => handleLike(photo._id)} disabled={!loggedInUser}>
                {isLiked(photo) ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
              </IconButton>
              <Typography variant="body2" color="textSecondary">
                {photo.likes?.length || 0} Likes
              </Typography>
            </div>

            <Typography variant="subtitle1">Comments:</Typography>
            {photo.comments && photo.comments.map((c) => (
              <div key={c._id} style={{ marginBottom: "8px" }}>
                <Typography variant="body2" component={Link} to={`/users/${c.user._id}`}>
                  {c.user ? `${c.user.first_name} ${c.user.last_name}` : "Unknown User"}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                  {c.date_time}
                </Typography>
                {loggedInUser && c.user && loggedInUser._id === c.user._id && (
                  <IconButton size="small" onClick={() => handleDeleteComment(photo._id, c._id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
                <Typography variant="body1">{c.comment}</Typography>
              </div>
            ))}
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <TextField
                label="Add a comment"
                variant="outlined"
                size="small"
                fullWidth
                value={newComments[photo._id] || ''}
                onChange={(e) => handleCommentChange(photo._id, e.target.value)}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleAddComment(photo._id)}
                disabled={addCommentMutation.isPending}
              >
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
        <MobileStepper
          steps={maxSteps}
          position="static"
          activeStep={activeStep}
          nextButton={(
            <Button
              size="small"
              onClick={handleNext}
              disabled={activeStep === maxSteps - 1}
            >
              Next
            </Button>
          )}
          backButton={(
            <Button
              size="small"
              onClick={handleBack}
              disabled={activeStep === 0}
            >
              Back
            </Button>
          )}
        />
      </div>
    );
  }

  // Standard View: List of Cards
  return (
    <div>
      {photos.map((photo) => (
        <Card key={photo._id} sx={{ mb: 2 }}>
          <CardHeader
            title={photo.file_name}
            subheader={photo.date_time}
            action={
              loggedInUser && loggedInUser._id === photo.user_id && (
                <IconButton onClick={() => handleDeletePhoto(photo._id)}>
                  <DeleteIcon />
                </IconButton>
              )
            }
          />
          <CardMedia
            component="img"
            image={`/images/${photo.file_name}`}
            alt={photo.file_name}
          />
          <CardContent>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <IconButton onClick={() => handleLike(photo._id)} disabled={!loggedInUser}>
                {isLiked(photo) ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
              </IconButton>
              <Typography variant="body2" color="textSecondary">
                {photo.likes?.length || 0} Likes
              </Typography>
            </div>

            <Typography variant="subtitle1">Comments:</Typography>
            {photo.comments && photo.comments.map((c) => (
              <div key={c._id} style={{ marginBottom: "8px" }}>
                <Typography variant="body2" component={Link} to={`/users/${c.user._id}`}>
                  {c.user ? `${c.user.first_name} ${c.user.last_name}` : "Unknown User"}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                  {c.date_time}
                </Typography>
                {loggedInUser && c.user && loggedInUser._id === c.user._id && (
                  <IconButton size="small" onClick={() => handleDeleteComment(photo._id, c._id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
                <Typography variant="body1">{c.comment}</Typography>
              </div>
            ))}
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <TextField
                label="Add a comment"
                variant="outlined"
                size="small"
                fullWidth
                value={newComments[photo._id] || ''}
                onChange={(e) => handleCommentChange(photo._id, e.target.value)}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleAddComment(photo._id)}
                disabled={addCommentMutation.isPending}
              >
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default UserPhotos;
