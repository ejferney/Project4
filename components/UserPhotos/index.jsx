
import React, { useState, useRef } from 'react';
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
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
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from "@mui/material";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from "react-router-dom";
import { fetchPhotosOfUser, addComment, fetchUserList, addTag, deleteTag } from '../../lib/api';
import useStore from '../../lib/store';

import './styles.css';

function UserPhotos({ userId, photoIndexParam }) {
  const navigate = useNavigate();
  const advancedEnabled = useStore((state) => state.advancedEnabled);
  const queryClient = useQueryClient();
  const [newComments, setNewComments] = useState({});

  // Tagging State
  const [taggingPhotoId, setTaggingPhotoId] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [currentSelection, setCurrentSelection] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const imgRef = useRef(null);

  const { data: photos, isPending, isError } = useQuery({
    queryKey: ['photos', userId],
    queryFn: () => fetchPhotosOfUser(userId),
    enabled: !!userId,
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUserList,
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ photoId, comment }) => addComment(photoId, comment),
    onSuccess: () => {
      queryClient.invalidateQueries(['photos', userId]);
      queryClient.invalidateQueries(['comments', userId]);
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCurrentSelection(null);
    setTaggingPhotoId(null);
    setSelectedUserId('');
  };

  const addTagMutation = useMutation({
    mutationFn: ({ photoId, tagData }) => addTag(photoId, tagData),
    onSuccess: () => {
      queryClient.invalidateQueries(['photos', userId]);
      handleCloseDialog();
    }
  });

  const deleteTagMutation = useMutation({
    mutationFn: ({ photoId, tagId }) => deleteTag(photoId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries(['photos', userId]);
    }
  });

  const handleDeleteTag = (e, photoId, tagId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this tag?")) {
      deleteTagMutation.mutate({ photoId, tagId });
    }
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
    });
  };

  // --- Tagging Logic ---

  const handleMouseDown = (e, photoId) => {
    e.preventDefault();
    imgRef.current = e.currentTarget;

    // Get image rect
    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setTaggingPhotoId(photoId);
    setDragStart({ x, y });
    setCurrentSelection({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!dragStart || !imgRef.current) return;
    e.preventDefault();

    const rect = imgRef.current.getBoundingClientRect();
    let currentX = e.clientX - rect.left;
    let currentY = e.clientY - rect.top;

    // Clip to image bounds
    currentX = Math.max(0, Math.min(currentX, rect.width));
    currentY = Math.max(0, Math.min(currentY, rect.height));

    const width = currentX - dragStart.x;
    const height = currentY - dragStart.y;

    // Normalize rectangle (handle negative width/height)
    const finalX = width < 0 ? currentX : dragStart.x;
    const finalY = height < 0 ? currentY : dragStart.y;
    const finalW = Math.abs(width);
    const finalH = Math.abs(height);

    setCurrentSelection({
      x: finalX,
      y: finalY,
      width: finalW,
      height: finalH
    });
  };

  const handleMouseUp = () => {
    if (!dragStart) return;
    setDragStart(null);

    // If selection is too small, ignore it
    if (currentSelection && (currentSelection.width < 10 || currentSelection.height < 10)) {
      setCurrentSelection(null);
      setTaggingPhotoId(null);
      return;
    }

    if (currentSelection) {
      setIsDialogOpen(true);
    }
  };

  const handleSubmitTag = () => {
    // Need image ref to calc percentages based on current size
    if (!selectedUserId || !taggingPhotoId || !currentSelection || !imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();

    const tagData = {
      user_id: selectedUserId,
      x: (currentSelection.x / rect.width) * 100,
      y: (currentSelection.y / rect.height) * 100,
      width: (currentSelection.width / rect.width) * 100,
      height: (currentSelection.height / rect.height) * 100
    };

    addTagMutation.mutate({ photoId: taggingPhotoId, tagData });
  };



  // --- Render Helpers ---

  const renderPhotoContent = (photo) => {
    const isBeingTagged = taggingPhotoId === photo._id && currentSelection;

    return (
      <>
        {/* Image Container */}
        <div
          style={{ position: 'relative', cursor: 'crosshair', display: 'inline-block' }}
          onMouseDown={(e) => handleMouseDown(e, photo._id)}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <CardMedia
            component="img"
            image={`/images/${photo.file_name}`}
            alt={photo.file_name}
            style={{ display: 'block' }}
            // We use onDragStart preventDefault on the image to stop browser native drag
            onDragStart={(e) => e.preventDefault()}
          />

          {/* Existing Tags */}
          {photo.tags && photo.tags.map(tag => (
            <Box
              key={tag._id}
              sx={{
                position: 'absolute',
                left: `${tag.x}%`,
                top: `${tag.y}%`,
                width: `${tag.width}%`,
                height: `${tag.height}%`,
                border: '2px solid white',
                boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                '&:hover .tag-label': { display: 'block' },
                '&:hover .delete-btn': { display: 'block' }
              }}
            >
              <Typography
                className="tag-label"
                variant="caption"
                sx={{
                  display: 'none',
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  padding: '2px 4px',
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (tag.user) navigate(`/users/${tag.user._id}`);
                }}
              >
                {tag.user ? `${tag.user.first_name} ${tag.user.last_name}` : 'Unknown'}
              </Typography>

              {/* Delete Button */}
              <Box
                className="delete-btn" // Relies on parent hover selector
                sx={{
                  display: 'none', // Shown on hover via CSS rule in parent
                  position: 'absolute',
                  top: -10,
                  right: -10,
                  backgroundColor: 'red',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  cursor: 'pointer',
                  color: 'white',
                  textAlign: 'center',
                  lineHeight: '20px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  zIndex: 20
                }}
                onClick={(e) => handleDeleteTag(e, photo._id, tag._id)}
              >
                X
              </Box>
            </Box>
          ))}

          {/* Current Selection Box */}
          {isBeingTagged && (
            <div
              style={{
                position: 'absolute',
                left: currentSelection.x,
                top: currentSelection.y,
                width: currentSelection.width,
                height: currentSelection.height,
                border: '2px dashed red',
                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                pointerEvents: 'none'
              }}
            />
          )}
        </div>

        <CardContent>
          <Typography variant="subtitle1">Comments:</Typography>
          {photo.comments && photo.comments.map((c) => (
            <div key={c._id} style={{ marginBottom: "8px" }}>
              <Typography variant="body2" component={Link} to={`/users/${c.user._id}`}>
                {c.user ? `${c.user.first_name} ${c.user.last_name}` : "Unknown User"}
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                {c.date_time}
              </Typography>
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
      </>
    );
  };

  if (isPending) return <Typography>Loading photos...</Typography>;
  if (isError) return <Typography>Error loading photos.</Typography>;
  if (!photos || photos.length === 0) return <Typography>This user has no photos.</Typography>;

  return (
    <div
      // Catch mouse up globally for drag safety
      onMouseUp={handleMouseUp}
    >
      <Dialog open={isDialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>Tag Photo</DialogTitle>
        <DialogContent style={{ minWidth: 300 }}>
          <FormControl fullWidth margin="normal">
            <InputLabel id="user-select-label">Select User</InputLabel>
            <Select
              labelId="user-select-label"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              label="Select User"
            >
              {users && users.map(user => (
                <MenuItem key={user._id} value={user._id}>
                  {user.first_name} {user.last_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmitTag} variant="contained" color="primary">Tag</Button>
        </DialogActions>
      </Dialog>

      {advancedEnabled ? (
        (() => {
          const maxSteps = photos.length;
          let activeStep = parseInt(photoIndexParam, 10);
          if (Number.isNaN(activeStep) || activeStep < 0 || activeStep >= maxSteps) activeStep = 0;

          const photo = photos[activeStep];
          if (!photo) return <Typography>Photo not found...</Typography>;

          return (
            <div style={{ maxWidth: 600, margin: "0 auto" }}>
              <Card>
                <CardHeader title={photo.file_name} subheader={photo.date_time} />
                {renderPhotoContent(photo)}
              </Card>
              <MobileStepper
                steps={maxSteps}
                position="static"
                activeStep={activeStep}
                nextButton={
                  <Button size="small" onClick={() => navigate(`/photos/${userId}/${activeStep + 1}`)} disabled={activeStep === maxSteps - 1}>Next</Button>
                }
                backButton={
                  <Button size="small" onClick={() => navigate(`/photos/${userId}/${activeStep - 1}`)} disabled={activeStep === 0}>Back</Button>
                }
              />
            </div>
          );
        })()
      ) : (
        <div>
          {photos.map((photo) => (
            <Card key={photo._id} sx={{ mb: 2 }}>
              <CardHeader title={photo.file_name} subheader={photo.date_time} />
              {renderPhotoContent(photo)}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default UserPhotos;
