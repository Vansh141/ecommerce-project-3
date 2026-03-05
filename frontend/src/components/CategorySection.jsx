import React from 'react';

const CategorySection = ({ title, bgImage, items }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row overflow-hidden mt-6">

            {/* Banner */}
            <div className="md:w-1/4 relative min-h-[250px] md:min-h-full overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bgImage})` }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                </div>
                <div className="absolute inset-0 p-6 flex flex-col justify-start z-10">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 bg-white/80 p-2 rounded inline-block backdrop-blur-sm shadow-sm">{title}</h3>
                    <button className="bg-white text-gray-800 px-4 py-2 rounded shadow-sm text-sm font-medium w-max hover:bg-gray-50 transition">
                        Explore all
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-4">
                {items.map((item, idx) => (
                    <div key={idx} className="border-b border-r border-gray-100 p-4 hover:shadow-inner transition bg-white flex flex-col justify-between cursor-pointer group">
                        <div>
                            <p className="text-sm font-medium text-gray-800">{item.name}</p>
                            <p className="text-xs text-gray-500 mt-1">From</p>
                            <p className="text-sm text-gray-400">USD {item.price}</p>
                        </div>
                        <div className="flex justify-end mt-4 h-16 w-full">
                            <img src={item.image} alt={item.name} className="h-full object-contain mix-blend-multiply group-hover:-translate-y-1 transition duration-300" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CategorySection;
