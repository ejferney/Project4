import React from "react";
// eslint-disable-next-line import/no-extraneous-dependencies
import ReactDOM from 'react-dom/client';
import { Grid, Typography, Paper } from '@mui/material';
import {
  BrowserRouter, Route, Routes, useParams, Navigate,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import './styles/main.css';
// Import mock setup - Remove this once you have implemented the actual API calls
//import './lib/mockSetup.js';
import TopBar from './components/TopBar';
import UserDetail from './components/UserDetail';
import UserList from './components/UserList';
import UserPhotos from './components/UserPhotos';
import UserComments from './components/UserComments';
import LoginRegister from './components/LoginRegister';
import useStore from './lib/store';

const queryClient = new QueryClient();

function UserDetailRoute() {
  const { userId } = useParams();
  // eslint-disable-next-line no-console
  console.log('UserDetailRoute: userId is:', userId);
  return <UserDetail userId={userId} />;
}

function UserPhotosRoute() {
  const { userId, photoIndex } = useParams();
  return (
    <UserPhotos
      userId={userId}
      photoIndexParam={photoIndex}
    />
  );
}

function UserCommentsRoute() {
  const { userId } = useParams();
  return (
    <UserComments
      userId={userId}
    />
  );
}

function ProtectedRoute({ children }) {
  const loggedInUser = useStore((state) => state.loggedInUser);
  return loggedInUser ? children : <Navigate to="/login-register" replace />;
}

function PhotoShare() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TopBar />
            </Grid>
            <div className="main-topbar-buffer" />
            <Grid item sm={3}>
              <Paper className="main-grid-item">
                <UserList />
              </Paper>
            </Grid>
            <Grid item sm={9}>
              <Paper className="main-grid-item">
                <Routes>
                  <Route path="/login-register" element={<LoginRegister />} />
                  <Route
                    path="/"
                    element={(
                      <ProtectedRoute>
                        <Typography variant="body1">
                          Page is intentionally blank.
                        </Typography>
                      </ProtectedRoute>
                    )}
                  />
                  <Route path="/users/:userId" element={<ProtectedRoute><UserDetailRoute /></ProtectedRoute>} />
                  <Route path="/photos/:userId" element={<ProtectedRoute><UserPhotosRoute /></ProtectedRoute>} />
                  <Route path="/photos/:userId/:photoIndex" element={<ProtectedRoute><UserPhotosRoute /></ProtectedRoute>} />
                  <Route path="/comments/:userId" element={<ProtectedRoute><UserCommentsRoute /></ProtectedRoute>} />
                  <Route path="/users" element={<ProtectedRoute><UserList /></ProtectedRoute>} />
                </Routes>
              </Paper>
            </Grid>
          </Grid>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('photoshareapp'));
root.render(<PhotoShare />);
