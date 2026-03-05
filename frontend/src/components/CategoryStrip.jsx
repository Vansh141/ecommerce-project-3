import React from 'react';
import { Link } from 'react-router-dom';

const CategoryStrip = () => {
    const categories = [
        {
            title: "New Arrivals",
            image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800",
            link: "/search?q=New Arrivals"
        },
        {
            title: "Dresses",
            image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=800",
            link: "/search?q=Dresses"
        },
        {
            title: "Accessories",
            image: "https://images.unsplash.com/photo-1509319117193-57bab727e09d?auto=format&fit=crop&q=80&w=800",
            link: "/search?q=Accessories"
        },
        {
            title: "Sale",
            image: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&q=80&w=800",
            link: "/search?q=Sale"
        }
    ];

    return (
        <section className="py-16 md:py-20 bg-touchCream">
            <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-serif text-touchDark mb-3 tracking-wide">Shop by Category</h2>
                    <p className="text-touchDark/70 font-light tracking-widest uppercase text-sm">Find your perfect style</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {categories.map((category, index) => (
                        <Link
                            key={index}
                            to={category.link}
                            className="group relative h-72 md:h-[400px] w-full overflow-hidden rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 block"
                        >
                            {/* Image Background */}
                            <div className="absolute inset-0">
                                <img
                                    src={category.image}
                                    alt={category.title}
                                    className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-105"
                                />
                            </div>

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-touchDark/80 via-touchDark/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300"></div>

                            {/* Content */}
                            <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
                                <h3 className="text-white text-2xl md:text-3xl font-serif tracking-wide transform translate-y-2 group-hover:-translate-y-1 transition-transform duration-300">
                                    {category.title}
                                </h3>
                                <div className="w-12 h-0.5 bg-touchSage mt-4 opacity-0 group-hover:opacity-100 transform -translate-x-4 group-hover:translate-x-0 transition-all duration-300 delay-100"></div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default CategoryStrip;
