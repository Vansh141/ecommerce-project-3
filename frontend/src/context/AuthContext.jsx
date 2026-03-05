import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [userInfo, setUserInfo] = useState(() => {
        const saved = localStorage.getItem('userInfo');
        return saved ? JSON.parse(saved) : null;
    });

    useEffect(() => {
        if (userInfo) {
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
        } else {
            localStorage.removeItem('userInfo');
        }
    }, [userInfo]);

    const login = async (email, password) => {
        const { data } = await api.post('/users/login', { email, password });
        setUserInfo(data);
        return data;
    };

    const register = async (name, email, password) => {
        const { data } = await api.post('/users/register', { name, email, password });
        setUserInfo(data);
        return data;
    };

    const logout = () => {
        setUserInfo(null);
    };

    return (
        <AuthContext.Provider value={{ userInfo, setUserInfo, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
