import React from 'react';

const Deals = () => {
    const deals = [
        { name: 'Smart watches', discount: '-25%', image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&q=80&w=200' },
        { name: 'Laptops', discount: '-12%', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=200' },
        { name: 'Headphones', discount: '-40%', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=200' },
        { name: 'Cameras', discount: '-30%', image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=200' },
        { name: 'Smartphones', discount: '-15%', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=200' },
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row overflow-hidden">
            <div className="p-6 border-b md:border-b-0 md:border-r border-gray-100 min-w-[200px] flex flex-col justify-center">
                <h3 className="text-xl font-bold text-gray-800 mb-1">Deals and offers</h3>
                <p className="text-sm text-gray-500 mb-4">Electronic equipments</p>

                <div className="flex gap-2">
                    <div className="bg-gray-800 text-white w-12 h-14 rounded-lg flex flex-col items-center justify-center">
                        <span className="font-bold text-lg leading-tight">04</span>
                        <span className="text-[10px] text-gray-300">Days</span>
                    </div>
                    <div className="bg-gray-800 text-white w-12 h-14 rounded-lg flex flex-col items-center justify-center">
                        <span className="font-bold text-lg leading-tight">13</span>
                        <span className="text-[10px] text-gray-300">Hour</span>
                    </div>
                    <div className="bg-gray-800 text-white w-12 h-14 rounded-lg flex flex-col items-center justify-center">
                        <span className="font-bold text-lg leading-tight">34</span>
                        <span className="text-[10px] text-gray-300">Min</span>
                    </div>
                    <div className="bg-gray-800 text-white w-12 h-14 rounded-lg flex flex-col items-center justify-center">
                        <span className="font-bold text-lg leading-tight">56</span>
                        <span className="text-[10px] text-gray-300">Sec</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-x-auto p-4 snap-x snap-mandatory hide-scrollbar">
                {deals.map((item, index) => (
                    <div key={index} className="min-w-[140px] flex flex-col items-center justify-between px-4 py-2 hover:scale-105 transition snap-center cursor-pointer border-r border-gray-100 last:border-0">
                        <div className="h-32 flex items-center justify-center w-full mb-4">
                            <img src={item.image} alt={item.name} className="max-h-full max-w-full object-contain rounded-md drop-shadow-sm mix-blend-multiply" />
                        </div>
                        <p className="text-sm text-gray-700 text-center font-medium mb-2">{item.name}</p>
                        <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full">
                            {item.discount}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Deals;
