import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { userInfo } = useAuth();
    const location = useLocation();

    if (!userInfo) {
        return <Navigate to={`/login?redirect=${location.pathname}`} replace />;
    }

    return children;
};

export default ProtectedRoute;
