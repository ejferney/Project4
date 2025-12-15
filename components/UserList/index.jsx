import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from "react-router-dom";
import { fetchUserList, fetchPhotosOfUser, fetchCommentsOfUser } from '../../lib/api';
import useStore from '../../lib/store';

import './styles.css';

function UserCountBubble({ userId, type }) {
  const { data } = useQuery({
    queryKey: [type, userId],
    queryFn: async () => {
      if (type === 'photos') {
        return fetchPhotosOfUser(userId);
      }
      if (type === 'comments') {
        return fetchCommentsOfUser(userId);
      }
      return [];
    },
  });

  if (!data) return null;

  const count = data.length;
  const bgColor = type === 'photos' ? 'green' : 'red';
  const title = type === 'photos' ? 'Number of photos' : 'View comments by this user';

  const bubble = (
    <span
      title={title}
      style={{
        display: "inline-block",
        minWidth: "24px",
        padding: "2px 6px",
        borderRadius: "12px",
        backgroundColor: bgColor,
        color: "white",
        fontSize: "0.75rem",
        textAlign: "center",
      }}
    >
      {count}
    </span>
  );

  if (type === 'comments') {
    return (
      <Link
        to={`/comments/${userId}`}
        style={{ textDecoration: "none" }}
        title={title}
      >
        {bubble}
      </Link>
    );
  }

  return bubble;
}

function UserList() {
  const advancedEnabled = useStore((state) => state.advancedEnabled);
  const loggedInUser = useStore((state) => state.loggedInUser);
  const { data: users, isPending, isError } = useQuery({
    queryKey: ['userList'],
    queryFn: fetchUserList,
    enabled: !!loggedInUser, // Only fetch if logged in
  });

  if (!loggedInUser) return null;

  if (isPending) return <div>Loading users...</div>;
  if (isError) return <div>Error loading users.</div>;

  return (
    <div style={{ padding: "8px" }}>
      <h3>User List</h3>
      <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
        {users.map((u) => (
          <li key={u._id} style={{ marginBottom: "8px" }}>
            <div>
              <Link to={`/users/${u._id}`}>
                {u.first_name} {u.last_name}
              </Link>
            </div>
            <div style={{ marginLeft: "16px" }}>
              <Link to={`/photos/${u._id}`}>Photos</Link>
            </div>

            {advancedEnabled && (
              <div
                style={{
                  marginTop: "4px",
                  display: "flex",
                  gap: "6px",
                  alignItems: "center",
                }}
              >
                <UserCountBubble userId={u._id} type="photos" />
                <UserCountBubble userId={u._id} type="comments" />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default UserList;
