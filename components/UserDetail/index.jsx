import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { fetchUser } from '../../lib/api';

import './styles.css';

function UserDetail({ userId }) {
  const { data: user, isPending, isError } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    enabled: !!userId,
  });

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
    </div>
  );
}

UserDetail.propTypes = {
  userId: PropTypes.string.isRequired,
};

export default UserDetail;
