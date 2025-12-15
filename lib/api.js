import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001',
  withCredentials: true,
});

export const fetchUserList = async () => {
  const response = await api.get('/user/list');
  return response.data;
};

export const fetchUser = async (userId) => {
  const response = await api.get(`/user/${userId}`);
  return response.data;
};

export const fetchPhotosOfUser = async (userId) => {
  const response = await api.get(`/photosOfUser/${userId}`);
  return response.data;
};

export const fetchCommentsOfUser = async (userId) => {
  const response = await api.get(`/commentsOfUser/${userId}`);
  return response.data;
};

export const loginUser = async (loginName, password) => {
  const response = await api.post('/admin/login', { login_name: loginName, password });
  return response.data;
};

export const registerUser = async (userData) => {
  const response = await api.post('/user', userData);
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post('/admin/logout');
  return response.data;
};

export const addComment = async (photoId, comment) => {
  const response = await api.post(`/commentsOfPhoto/${photoId}`, { comment });
  return response.data;
};

export const addTag = async (photoId, tagData) => {
  // tagData: { user_id, x, y, width, height }
  const response = await api.post(`/photos/${photoId}/tags`, tagData);
  return response.data;
};

export const deleteTag = async (photoId, tagId) => {
  const response = await api.delete(`/photos/${photoId}/tags/${tagId}`);
  return response.data;
};

export const uploadPhoto = async (file) => {
  const formData = new FormData();
  formData.append('uploadedphoto', file);
  const response = await api.post('/photos/new', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export default api;
