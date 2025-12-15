import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import PropTypes from 'prop-types';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Typography, Button } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { fetchUser, deleteUser } from '../../lib/api';
import useStore from '../../lib/store';

import './styles.css';

function UserDetail({ userId }) {
  const navigate = useNavigate();
  const loggedInUser = useStore((state) => state.loggedInUser);
  const logout = useStore((state) => state.logout);

  const { data: user, isPending, isError } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    enabled: !!userId,
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => deleteUser(id),
    onSuccess: () => {
      logout();
      navigate('/login-register');
    },
    onError: (err) => {
      console.error("Failed to delete user", err);
      // eslint-disable-next-line no-alert
      alert("Failed to delete account");
    }
  });

  const handleDeleteAccount = () => {
    // eslint-disable-next-line no-alert
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      deleteUserMutation.mutate(userId);
    }
  };

  if (isPending) {
    return <Typography variant="body1">Loading user details...</Typography>;
  }

  if (isError || !user) {
    return (
      <Typography variant="body1">
        This should be the UserDetail view of the PhotoShare app. Since it is
        invoked from React Router the params from the route will be in the
        property userId. So this should show details of user:
        {' '}
        {userId}
        . You can
        fetch the model for the user from API: /user/:id
      </Typography>
    );
  }

  return (
    <div>
      <Typography variant="body1">
        {user.first_name} {user.last_name}
      </Typography>

      <Typography variant="body1">
        {user.location} — {user.occupation}
      </Typography>

      <Typography variant="body1">{user.description}</Typography>

      <Typography variant="body1">
        <Link to={`/photos/${user._id}`}>View Photos</Link>
      </Typography>

      {loggedInUser && loggedInUser._id === userId && (
        <Button
          variant="contained"
          color="error"
          onClick={handleDeleteAccount}
          sx={{ mt: 4 }}
        >
          Delete Account
        </Button>
      )}
    </div>
  );
}

UserDetail.propTypes = {
  userId: PropTypes.string.isRequired,
};

export default UserDetail;
