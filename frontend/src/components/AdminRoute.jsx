import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldOff } from 'lucide-react';

const AdminRoute = ({ children }) => {
    const { userInfo } = useAuth();
    const location = useLocation();

    // Not logged in → redirect to login
    if (!userInfo) {
        return <Navigate to={`/login?redirect=${location.pathname}`} replace />;
    }

    // Logged in but not admin → show access denied
    if (!userInfo.isAdmin) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                    <ShieldOff size={36} className="text-red-400" />
                </div>
                <h1 className="text-3xl font-serif text-touchDark mb-3">Access Denied</h1>
                <p className="text-touchDark/60 font-light mb-6 max-w-xs">
                    You don't have administrator privileges to view this page.
                </p>
                <Navigate to="/" replace />
            </div>
        );
    }

    return children;
};

export default AdminRoute;
