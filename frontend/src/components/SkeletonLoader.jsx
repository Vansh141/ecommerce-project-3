import React from 'react';

const SkeletonLoader = () => {
    return (
        <div className="bg-white rounded-2xl p-4 flex flex-col h-full border border-gray-100 shadow-sm animate-pulse">
            {/* Image Placeholder */}
            <div className="h-48 mb-5 bg-gray-200 rounded-xl relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
            </div>

            {/* Content Placeholder */}
            <div className="flex flex-col flex-1 px-1">
                {/* Brand Placeholder */}
                <div className="h-3 w-1/3 bg-gray-200 rounded mb-2"></div>

                {/* Title Placeholder */}
                <div className="space-y-2 flex-1 mt-2">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                </div>

                {/* Rating Placeholder */}
                <div className="flex items-center gap-1 mt-4 mb-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-3 h-3 bg-gray-200 rounded-full"></div>
                    ))}
                    <div className="w-8 h-3 ml-2 bg-gray-200 rounded"></div>
                </div>

                {/* Footer Placeholder (Price & Action) */}
                <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div className="h-6 w-20 bg-gray-200 rounded"></div>
                </div>

                {/* Button Placeholder */}
                <div className="mt-4 w-full h-10 bg-indigo-50/50 rounded-xl"></div>
            </div>
        </div>
    );
};

export default SkeletonLoader;
