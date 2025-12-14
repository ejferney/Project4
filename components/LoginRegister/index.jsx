import React, { useState } from 'react';
import { Typography, TextField, Button, Paper, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser } from '../../lib/api';
import useStore from '../../lib/store';

import './styles.css';

function LoginRegister() {
    const [loginName, setLoginName] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    const [regLoginName, setRegLoginName] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirmPassword, setRegConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [occupation, setOccupation] = useState('');
    const [regError, setRegError] = useState('');
    const [regSuccess, setRegSuccess] = useState('');

    const setLoggedInUser = useStore((state) => state.setLoggedInUser);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');

        try {
            const user = await loginUser(loginName, password);
            setLoggedInUser(user);
            navigate(`/users/${user._id}`);
        } catch (err) {
            setLoginError('Login failed. Please check your credentials.');
            console.error('Login error:', err);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setRegError('');
        setRegSuccess('');

        if (regPassword !== regConfirmPassword) {
            setRegError("Passwords do not match.");
            return;
        }

        if (!regLoginName || !regPassword || !firstName || !lastName) {
            setRegError("Please fill in all required fields.");
            return;
        }

        try {
            const userData = {
                login_name: regLoginName,
                password: regPassword,
                first_name: firstName,
                last_name: lastName,
                location,
                description,
                occupation,
            };
            await registerUser(userData);
            setRegSuccess("Registration successful! You can now log in.");
            // Clear form
            setRegLoginName('');
            setRegPassword('');
            setRegConfirmPassword('');
            setFirstName('');
            setLastName('');
            setLocation('');
            setDescription('');
            setOccupation('');
        } catch (err) {
            setRegError(err.response?.data?.error || "Registration failed.");
            console.error("Registration error:", err);
        }
    };

    return (
        <div className="login-register-container" style={{ padding: '20px' }}>
            <Grid container spacing={4} justifyContent="center">
                <Grid item xs={12} md={5}>
                    <Paper elevation={3} className="login-register-paper" style={{ padding: '20px' }}>
                        <Typography variant="h4" gutterBottom>
                            Login
                        </Typography>
                        <form onSubmit={handleLogin}>
                            <TextField
                                label="Login Name"
                                variant="outlined"
                                fullWidth
                                margin="normal"
                                value={loginName}
                                onChange={(e) => setLoginName(e.target.value)}
                            />
                            <TextField
                                label="Password"
                                type="password"
                                variant="outlined"
                                fullWidth
                                margin="normal"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            {loginError && (
                                <Typography color="error" variant="body2" gutterBottom>
                                    {loginError}
                                </Typography>
                            )}
                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                fullWidth
                                sx={{ mt: 2 }}
                            >
                                Login
                            </Button>
                        </form>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={5}>
                    <Paper elevation={3} className="login-register-paper" style={{ padding: '20px' }}>
                        <Typography variant="h4" gutterBottom>
                            Register
                        </Typography>
                        <form onSubmit={handleRegister}>
                            <TextField
                                label="Login Name *"
                                variant="outlined"
                                fullWidth
                                margin="normal"
                                value={regLoginName}
                                onChange={(e) => setRegLoginName(e.target.value)}
                            />
                            <TextField
                                label="Password *"
                                type="password"
                                variant="outlined"
                                fullWidth
                                margin="normal"
                                value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)}
                            />
                            <TextField
                                label="Confirm Password *"
                                type="password"
                                variant="outlined"
                                fullWidth
                                margin="normal"
                                value={regConfirmPassword}
                                onChange={(e) => setRegConfirmPassword(e.target.value)}
                            />
                            <TextField
                                label="First Name *"
                                variant="outlined"
                                fullWidth
                                margin="normal"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                            />
                            <TextField
                                label="Last Name *"
                                variant="outlined"
                                fullWidth
                                margin="normal"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                            />
                            <TextField
                                label="Location"
                                variant="outlined"
                                fullWidth
                                margin="normal"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                            />
                            <TextField
                                label="Description"
                                variant="outlined"
                                fullWidth
                                margin="normal"
                                multiline
                                rows={2}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                            <TextField
                                label="Occupation"
                                variant="outlined"
                                fullWidth
                                margin="normal"
                                value={occupation}
                                onChange={(e) => setOccupation(e.target.value)}
                            />
                            {regError && (
                                <Typography color="error" variant="body2" gutterBottom>
                                    {regError}
                                </Typography>
                            )}
                            {regSuccess && (
                                <Typography color="primary" variant="body2" gutterBottom>
                                    {regSuccess}
                                </Typography>
                            )}
                            <Button
                                type="submit"
                                variant="contained"
                                color="secondary"
                                fullWidth
                                sx={{ mt: 2 }}
                            >
                                Register Me
                            </Button>
                        </form>
                    </Paper>
                </Grid>
            </Grid>
        </div>
    );
}

export default LoginRegister;
