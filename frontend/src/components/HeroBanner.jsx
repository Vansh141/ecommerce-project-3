import React from 'react';
import { Link } from 'react-router-dom';

const HeroBanner = () => {
    return (
        <div className="max-w-7xl mx-auto rounded-2xl shadow-sm overflow-hidden relative min-h-[500px] flex items-center bg-gradient-to-r from-touchPink via-touchCream to-touchSage">
            <div className="flex flex-col md:flex-row items-center w-full h-full relative z-10">
                {/* Left Content */}
                <div className="w-full md:w-1/2 p-10 md:p-16 flex flex-col justify-center text-center md:text-left">
                    <span className="text-touchDark/80 uppercase tracking-[0.3em] text-sm font-medium mb-4">Latest Collection</span>
                    <h1 className="text-4xl md:text-6xl text-touchDark font-serif tracking-wide mb-6 leading-tight">
                        New Season Styles
                    </h1>
                    <p className="text-touchDark mb-10 max-w-lg mx-auto md:mx-0 text-lg font-light leading-relaxed">
                        Discover elegant pieces designed to make every moment beautiful.
                    </p>
                    <Link to="/search?q=Dresses" className="bg-touchPink text-white font-semibold rounded-xl hover:opacity-90 hover:scale-105 transition-all duration-300 px-6 py-3 shadow-sm hover:shadow-md self-center md:self-start w-fit">
                        Shop Dresses
                    </Link>
                </div>

                {/* Right Image */}
                <div className="w-full md:w-1/2 p-6 md:p-12 flex items-center justify-center">
                    <div className="relative w-full max-w-lg h-[450px] md:h-[500px] overflow-hidden rounded-2xl shadow-sm group">
                        <img
                            src="https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&q=80&w=800"
                            alt="Fashion New Season"
                            className="w-full h-full object-cover object-[center_20%] transition-transform duration-700 ease-in-out group-hover:scale-105"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeroBanner;
