import React from 'react';
import { X } from 'lucide-react';

const categories = ['New Arrivals', 'Dresses', 'Accessories', 'Sale'];
const priceRanges = ['Under ₹50', '₹50–₹150', '₹150+'];
const sizes = ['S', 'M', 'L', 'XL'];
const sortOptions = ['Newest', 'Price: Low to High', 'Price: High to Low'];

const FilterSidebar = ({
    selectedCategory, setSelectedCategory,
    selectedSizes, setSelectedSizes,
    priceRange, setPriceRange,
    sortOption, setSortOption,
    onClose
}) => {
    const handleSizeToggle = (size) => {
        if (selectedSizes.includes(size)) {
            setSelectedSizes(selectedSizes.filter(s => s !== size));
        } else {
            setSelectedSizes([...selectedSizes, size]);
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-touchPink/20 sticky top-24">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-serif text-touchDark">Filters</h2>
                {onClose && (
                    <button onClick={onClose} className="md:hidden text-touchDark/50 hover:text-touchPink transition-colors">
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Sort (Mobile mainly displays here, but good for both) */}
            <div className="mb-6 md:hidden">
                <h3 className="text-sm font-medium text-touchDark mb-3 uppercase tracking-wider">Sort By</h3>
                <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="w-full bg-touchCream/30 border border-touchPink/20 text-touchDark text-sm rounded-xl px-4 py-2.5 outline-none focus:border-touchPink transition-colors appearance-none cursor-pointer"
                >
                    {sortOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>

            {/* Category */}
            <div className="mb-8">
                <h3 className="text-sm font-medium text-touchDark mb-4 uppercase tracking-wider">Category</h3>
                <div className="space-y-3">
                    <button
                        onClick={() => setSelectedCategory('')}
                        className={`block text-sm transition-colors text-left w-full ${selectedCategory === '' ? 'text-touchPink font-medium' : 'text-touchDark/70 hover:text-touchPink'}`}
                    >
                        All Categories
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`block text-sm transition-colors text-left w-full ${selectedCategory === cat ? 'text-touchPink font-medium' : 'text-touchDark/70 hover:text-touchPink'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Price */}
            <div className="mb-8">
                <h3 className="text-sm font-medium text-touchDark mb-4 uppercase tracking-wider">Price</h3>
                <div className="space-y-3">
                    <button
                        onClick={() => setPriceRange('')}
                        className={`block text-sm transition-colors text-left w-full ${priceRange === '' ? 'text-touchPink font-medium' : 'text-touchDark/70 hover:text-touchPink'}`}
                    >
                        Any Price
                    </button>
                    {priceRanges.map(range => (
                        <button
                            key={range}
                            onClick={() => setPriceRange(range)}
                            className={`block text-sm transition-colors text-left w-full ${priceRange === range ? 'text-touchPink font-medium' : 'text-touchDark/70 hover:text-touchPink'}`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            {/* Size */}
            <div className="mb-8">
                <h3 className="text-sm font-medium text-touchDark mb-4 uppercase tracking-wider">Size</h3>
                <div className="flex flex-wrap gap-2.5">
                    {sizes.map(size => (
                        <button
                            key={size}
                            onClick={() => handleSizeToggle(size)}
                            className={`w-11 h-11 rounded-full flex items-center justify-center text-sm transition-all duration-300 border ${selectedSizes.includes(size)
                                ? 'bg-touchDark text-white border-touchDark shadow-sm'
                                : 'bg-white text-touchDark/70 border-touchPink/30 hover:border-touchPink'
                                }`}
                        >
                            {size}
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={() => {
                    setSelectedCategory('');
                    setSelectedSizes([]);
                    setPriceRange('');
                    setSortOption('Newest');
                }}
                className="w-full py-3 mt-2 bg-touchCream/50 text-touchDark text-sm font-medium rounded-xl hover:bg-touchCream transition-colors border border-touchPink/20"
            >
                Clear All Filters
            </button>
        </div>
    );
};

export default FilterSidebar;
