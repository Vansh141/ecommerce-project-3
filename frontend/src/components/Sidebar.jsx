import React from 'react';
import { Monitor, Smartphone, Watch, Shirt, Home, Gamepad, Coffee } from 'lucide-react';

const Sidebar = () => {
    const categories = [
        { name: 'Automobiles', icon: <Monitor size={18} /> },
        { name: 'Clothes and wear', icon: <Shirt size={18} /> },
        { name: 'Home appliances', icon: <Home size={18} /> },
        { name: 'Computer and tech', icon: <Smartphone size={18} /> },
        { name: 'Tools, equipments', icon: <Gamepad size={18} /> },
        { name: 'Sports and outdoor', icon: <Watch size={18} /> },
        { name: 'Books and stationery', icon: <Coffee size={18} /> },
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 h-full">
            <ul className="space-y-1">
                {categories.map((cat, idx) => (
                    <li key={idx}>
                        <a
                            href="#"
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${idx === 0 ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                        >
                            <span className="text-gray-400">{cat.icon}</span>
                            {cat.name}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Sidebar;
