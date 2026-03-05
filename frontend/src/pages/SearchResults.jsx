import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import FilterSidebar from '../components/FilterSidebar';
import { Search, ArrowLeft, SlidersHorizontal } from 'lucide-react';
import api from '../services/api';

const SearchResults = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';

    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters state
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedSizes, setSelectedSizes] = useState([]);
    const [priceRange, setPriceRange] = useState('');
    const [sortOption, setSortOption] = useState('Newest');
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const { data } = await api.get('/products');
                const productList = data.products || data;
                setProducts(productList);
                setError(null);
            } catch (err) {
                setError('Failed to fetch products');
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    useEffect(() => {
        let results = [...products];

        // 1. Search Query
        if (query.trim()) {
            const lowerQuery = query.toLowerCase().trim();
            results = results.filter((product) => {
                const matchName = product.name?.toLowerCase().includes(lowerQuery);
                const matchBrand = product.brand?.toLowerCase().includes(lowerQuery);
                const matchCategory = product.category?.toLowerCase().includes(lowerQuery);
                return matchName || matchBrand || matchCategory;
            });
        }

        // 2. Category Filter
        if (selectedCategory) {
            results = results.filter((product) => product.category?.toLowerCase() === selectedCategory.toLowerCase());
        }

        // 3. Price Filter
        if (priceRange) {
            results = results.filter((product) => {
                const price = Number(product.price);
                if (priceRange === 'Under $50') return price < 50;
                if (priceRange === '$50–$150') return price >= 50 && price <= 150;
                if (priceRange === '$150+') return price > 150;
                return true;
            });
        }

        // 4. Size Filter
        if (selectedSizes.length > 0) {
            results = results.filter((product) => {
                if (product.sizes && Array.isArray(product.sizes)) {
                    return product.sizes.some(s => selectedSizes.includes(s));
                }
                // Fallback: If no sizes array, it passes (since any product might fit)
                return true;
            });
        }

        // 5. Sort Option
        if (sortOption === 'Price: Low to High') {
            results.sort((a, b) => Number(a.price) - Number(b.price));
        } else if (sortOption === 'Price: High to Low') {
            results.sort((a, b) => Number(b.price) - Number(a.price));
        } else if (sortOption === 'Newest') {
            results.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        }

        setFilteredProducts(results);
    }, [query, products, selectedCategory, selectedSizes, priceRange, sortOption]);

    return (
        <div className="py-8 max-w-7xl mx-auto px-4 lg:px-0 min-h-[60vh]">
            {/* Header Area */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-touchPink/20 pb-6">
                <div>
                    <Link to="/" className="inline-flex items-center text-touchDark/60 hover:text-touchPink transition-colors font-light tracking-wide text-sm mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Shopping
                    </Link>
                    <h1 className="text-3xl lg:text-4xl font-serif text-touchDark mb-2 flex items-center gap-3">
                        {query ? (
                            <><Search className="text-touchPink" size={28} /> Search Results</>
                        ) : (
                            'Shop All'
                        )}
                    </h1>

                    {query ? (
                        <p className="text-touchDark/60 font-light tracking-wide">
                            Showing results for <span className="font-medium text-touchDark">"{query}"</span>
                        </p>
                    ) : (
                        <p className="text-touchDark/60 font-light tracking-wide">
                            Browse our complete boutique collection.
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-2 bg-white border border-touchPink/20 rounded-xl px-4 py-2.5 shadow-sm">
                        <span className="text-sm text-touchDark/70 font-medium tracking-wide">Sort by:</span>
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="bg-transparent border-none text-touchDark text-sm font-medium outline-none cursor-pointer focus:text-touchPink transition-colors appearance-none"
                        >
                            <option>Newest</option>
                            <option>Price: Low to High</option>
                            <option>Price: High to Low</option>
                        </select>
                    </div>

                    <button
                        onClick={() => setShowMobileFilters(true)}
                        className="md:hidden flex items-center justify-center gap-2 w-full md:w-auto bg-touchDark text-white px-6 py-3 rounded-xl font-medium shadow-sm hover:bg-touchDark/90 transition-colors"
                    >
                        <SlidersHorizontal size={18} />
                        Filters & Sort
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-touchPink"></div>
                </div>
            ) : error ? (
                <div className="text-center py-20 text-red-500 bg-red-50 rounded-2xl">{error}</div>
            ) : (
                <div className="flex flex-col md:flex-row gap-8 relative">
                    {/* Desktop Sidebar Filter */}
                    <div className="hidden md:block w-72 shrink-0">
                        <FilterSidebar
                            selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
                            selectedSizes={selectedSizes} setSelectedSizes={setSelectedSizes}
                            priceRange={priceRange} setPriceRange={setPriceRange}
                            sortOption={sortOption} setSortOption={setSortOption}
                        />
                    </div>

                    {/* Mobile Filter Drawer Base Overlay */}
                    {showMobileFilters && (
                        <div className="fixed inset-0 bg-touchDark/50 z-50 md:hidden flex justify-end backdrop-blur-sm" onClick={() => setShowMobileFilters(false)}>
                            <div
                                className="bg-touchCream w-4/5 max-w-sm h-full overflow-y-auto shadow-2xl transition-transform transform p-0 border-l border-touchPink/20"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <FilterSidebar
                                    selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
                                    selectedSizes={selectedSizes} setSelectedSizes={setSelectedSizes}
                                    priceRange={priceRange} setPriceRange={setPriceRange}
                                    sortOption={sortOption} setSortOption={setSortOption}
                                    onClose={() => setShowMobileFilters(false)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Products Grid right side */}
                    <div className="flex-1">
                        {filteredProducts.length > 0 ? (
                            <>
                                <div className="flex justify-between items-center mb-6">
                                    <p className="text-xs font-semibold text-touchDark/70 tracking-[0.15em] uppercase border-b-2 border-touchPink/30 pb-1">{filteredProducts.length} Results Found</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                                    {filteredProducts.map((product) => (
                                        <ProductCard key={product._id || product.id} item={product} />
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-3xl border border-touchPink/20 shadow-sm w-full h-full">
                                <Search size={48} className="text-touchPink/40 mb-6" />
                                <h2 className="text-2xl font-serif text-touchDark mb-3">
                                    {query ? `No products match your filters for '${query}'` : 'No products match your filters'}
                                </h2>
                                <p className="text-touchDark/60 font-light tracking-wide mb-8">Try clearing some filters or utilizing a more generic parameter.</p>
                                <button
                                    onClick={() => {
                                        setSelectedCategory('');
                                        setSelectedSizes([]);
                                        setPriceRange('');
                                        setSortOption('Newest');
                                    }}
                                    className="bg-touchDark text-white px-8 py-3 rounded-xl font-medium tracking-wide hover:bg-touchDark/90 transition-all duration-300 shadow-sm"
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchResults;
