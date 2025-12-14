import React, { useEffect, useState, useRef } from 'react';
import { AppBar, Toolbar, Typography, FormControlLabel, Switch, Button } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useStore from '../../lib/store';
import { logoutUser, fetchUser, uploadPhoto } from '../../lib/api';

import './styles.css';

function TopBar() {
  const location = useLocation();
  const [rightText, setRightText] = useState('PhotoShare App');
  const advancedEnabled = useStore((state) => state.advancedEnabled);
  const toggleAdvancedFeatures = useStore((state) => state.toggleAdvancedFeatures);
  const loggedInUser = useStore((state) => state.loggedInUser);
  const logout = useStore((state) => state.logout);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: (file) => uploadPhoto(file),
    onSuccess: () => {
      // Invalidate photos query for the current user to refresh the list
      if (loggedInUser) {
        queryClient.invalidateQueries(['photos', loggedInUser._id]);
        // Also invalidate user list in case we show photo counts
        queryClient.invalidateQueries(['users']);
      }
      // Optionally navigate to the user's photos page
      if (loggedInUser) {
        navigate(`/photos/${loggedInUser._id}`);
      }
    },
    onError: (err) => {
      console.error("Upload failed:", err);
      // Could show a snackbar here
    }
  });

  useEffect(() => {
    if (!loggedInUser) {
      setRightText('Please Login');
      return;
    }

    const path = location.pathname || '/';

    if (path === '/' || path === '/photo-share.html') {
      setRightText('Welcome');
      return;
    }

    if (path === '/users') {
      setRightText('User List');
      return;
    }

    // Try to match /users/:id or /photos/:id or /photos/:id/:index
    const match = path.match(/^\/(users|photos|comments)\/([^/]+)/);
    if (match && match[2]) {
      const id = match[2];
      fetchUser(id)
        .then((u) => {
          if (!u) {
            setRightText("PhotoShare App");
            return;
          }
          const name = `${u.first_name} ${u.last_name}`;
          if (path.startsWith("/photos/")) {
            setRightText(`Photos of ${name}`);
          } else if (path.startsWith("/comments/")) {
            setRightText(`Comments by ${name}`);
          } else {
            setRightText(name);
          }
        })
        .catch(() => {
          setRightText("PhotoShare App");
        });
      return;
    }

    setRightText('PhotoShare App');
  }, [location, loggedInUser]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      logout();
      navigate('/login-register');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleAddPhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      uploadMutation.mutate(file);
    }
    // Reset input so same file can be selected again if needed
    e.target.value = null;
  };

  return (
    <AppBar className="topbar-appBar" position="absolute">
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Typography variant="h5" color="inherit">
            Garrett McGinn
          </Typography>
          {loggedInUser && (
            <Typography variant="h6" color="inherit">
              Hi {loggedInUser.first_name}
            </Typography>
          )}
        </div>

        <Typography variant="subtitle1" color="inherit">
          {rightText}
        </Typography>

        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', gap: '16px' }}>
          <FormControlLabel
            control={(
              <Switch
                checked={advancedEnabled}
                onChange={toggleAdvancedFeatures}
                color="default"
              />
            )}
            label="Enable Advanced Features"
          />
          {loggedInUser && (
            <>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <Button
                variant="contained"
                color="secondary"
                onClick={handleAddPhotoClick}
                disabled={uploadMutation.isPending}
              >
                Add Photo
              </Button>
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </>
          )}
        </div>
      </Toolbar>
    </AppBar>
  );
}

export default TopBar;
