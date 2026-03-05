import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ProductCard from './ProductCard';
import SkeletonLoader from './SkeletonLoader';

const Recommended = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await api.get('/products');
                // Assuming response.data is an array of products
                setItems(Array.isArray(response.data) ? response.data : (response.data.products || []));
                setLoading(false);
            } catch (err) {
                console.error("Error fetching products:", err);
                setError(err.response?.data?.message || err.message || "Failed to fetch products");
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    if (error) {
        return (
            <div className="mt-12 p-6 bg-red-50/50 backdrop-blur-sm text-red-600 rounded-2xl border border-red-100 shadow-sm flex flex-col items-center justify-center">
                <span className="text-3xl mb-2">⚠️</span>
                <p className="font-medium">Error loading products</p>
                <p className="text-sm mt-1 text-red-400">{error}</p>
            </div>
        );
    }

    return (
        <div className="mt-12 mb-16">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">Featured Products</h2>
                    <p className="text-gray-500 text-base mt-2">Handpicked for you</p>
                </div>
                <button className="text-indigo-600 text-sm font-semibold hover:text-indigo-700 transition-colors flex items-center gap-1 group">
                    View all
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {/* Empty State */}
                {items.length === 0 && !loading && !error && (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-400 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                        <span className="text-4xl mb-3 opacity-50">🛍️</span>
                        <p className="font-medium text-gray-500">No products available at the moment.</p>
                    </div>
                )}

                {/* Loading State grids */}
                {loading && (
                    [...Array(10)].map((_, idx) => (
                        <div key={`skeleton-${idx}`} className="flex flex-col h-full">
                            <SkeletonLoader />
                        </div>
                    ))
                )}

                {/* Loaded Grid */}
                {!loading && items.map((item) => (
                    <div key={item._id || item.id} className="flex flex-col h-full">
                        <ProductCard item={item} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Recommended;
