import React from 'react';
import HeroBanner from '../components/HeroBanner';
import CategoryStrip from '../components/CategoryStrip';
import Recommended from '../components/Recommended';

const Home = () => {
    return (
        <div className="flex flex-col pb-12 w-full">
            {/* Hero Banner Section */}
            <section className="w-full h-auto min-h-[400px] md:h-[500px] rounded-2xl overflow-hidden mt-2 mb-16 md:mb-20">
                <HeroBanner />
            </section>

            {/* Shop by Category Strip */}
            <CategoryStrip />

            {/* Featured Products Grid Section */}
            <section className="w-full mt-12 md:mt-24">
                <Recommended />
            </section>
        </div>
    );
};

export default Home;
