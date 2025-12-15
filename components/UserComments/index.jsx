// components/UserComments/index.jsx

import React from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useQuery } from '@tanstack/react-query';
import { fetchCommentsOfUser } from '../../lib/api';
import useStore from '../../lib/store';

import "./styles.css";

function UserComments({ userId }) {
  const navigate = useNavigate();
  const advancedEnabled = useStore((state) => state.advancedEnabled);

  const { data: comments, isPending, isError } = useQuery({
    queryKey: ['comments', userId],
    queryFn: () => fetchCommentsOfUser(userId),
    enabled: !!userId,
  });

  const handleClickComment = (c) => {
    const ownerId = c.photo?.user_id;
    if (!ownerId) return;

    if (advancedEnabled) {
      navigate(`/photos/${ownerId}`);
    } else {
      navigate(`/photos/${ownerId}`);
    }
  };

  if (isPending) {
    return <Typography variant="body1">Loading comments...</Typography>;
  }

  if (isError) {
    return (
      <Typography variant="body1">
        Error loading comments.
      </Typography>
    );
  }

  if (!comments || comments.length === 0) {
    return (
      <Typography variant="body1">
        This user has not authored any comments.
      </Typography>
    );
  }

  return (
    <div>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Comments by this user
      </Typography>
      {comments.map((c) => (
        <Card
          key={c._id}
          sx={{ mb: 2, display: "flex", cursor: "pointer" }}
          onClick={() => handleClickComment(c)}
        >
          {c.photo && (
            <CardMedia
              component="img"
              sx={{ width: 100 }}
              image={`/images/${c.photo.file_name}`}
              alt="comment photo"
            />
          )}
          <CardContent>
            <Typography variant="body2" color="textSecondary">
              On photo:
              {" "}
              {c.photo ? c.photo.file_name : 'Unknown photo'}
            </Typography>
            <Typography variant="body1">
              {c.comment}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {c.date_time}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default UserComments;
