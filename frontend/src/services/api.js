import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
});

// Request Interceptor to add JWT token if available
api.interceptors.request.use(
    (config) => {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            const parsedUserInfo = JSON.parse(userInfo);
            if (parsedUserInfo.token) {
                config.headers.Authorization = `Bearer ${parsedUserInfo.token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
