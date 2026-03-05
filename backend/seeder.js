const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is not defined in the environment variables.");
        }
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Database Connection Error: ${error.message}`);
        process.exit(1);
    }
};

const sampleProducts = [
    {
        name: 'Wireless Noise-Cancelling Headphones',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
        description: 'Experience premium sound quality with these wireless noise-cancelling headphones. Perfect for travel or focused work sessions.',
        brand: 'AudioTech',
        category: 'Electronics',
        price: 299.99,
        countInStock: 25,
        rating: 4.8,
        numReviews: 124,
        discount: 10
    },
    {
        name: 'Ultra HD 4K Smart TV',
        image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1',
        description: 'Immerse yourself in stunning 4K resolution and smart features that bring your favorite movies and shows to life.',
        brand: 'VisionPlus',
        category: 'Electronics',
        price: 799.99,
        countInStock: 10,
        rating: 4.6,
        numReviews: 89,
        discount: 5
    },
    {
        name: 'Professional DSLR Camera',
        image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32',
        description: 'Capture life\'s moments in incredible detail with this professional-grade DSLR camera featuring a 24.2 MP sensor.',
        brand: 'OpticPro',
        category: 'Photography',
        price: 1299.00,
        countInStock: 5,
        rating: 4.9,
        numReviews: 42,
        discount: 0
    },
    {
        name: 'Minimalist Leather Smartwatch',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
        description: 'Stay connected in style with this elegant smartwatch featuring fitness tracking and notification sync.',
        brand: 'TimeMaster',
        category: 'Wearables',
        price: 149.99,
        countInStock: 50,
        rating: 4.5,
        numReviews: 210,
        discount: 15
    },
    {
        name: 'Ergonomic Office Chair',
        image: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1',
        description: 'Work in ultimate comfort with this adjustable ergonomic chair designed for long hours at the desk.',
        brand: 'ComfortFurn',
        category: 'Furniture',
        price: 199.50,
        countInStock: 15,
        rating: 4.7,
        numReviews: 76,
        discount: 0
    },
    {
        name: 'High-Performance Gaming Laptop',
        image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302',
        description: 'Dominate your games with this powerful laptop equipped with an advanced cooling system and top-tier graphics.',
        brand: 'GamerGear',
        category: 'Computers',
        price: 1599.99,
        countInStock: 8,
        rating: 4.8,
        numReviews: 55,
        discount: 20
    },
    {
        name: 'Smart Home Security Camera',
        image: 'https://images.unsplash.com/photo-1557324232-b8917d3c3dcb',
        description: 'Keep your home safe with this 1080p smart security camera featuring night vision and two-way audio.',
        brand: 'SafeHome',
        category: 'Smart Home',
        price: 89.99,
        countInStock: 30,
        rating: 4.4,
        numReviews: 142,
        discount: 5
    },
    {
        name: 'Premium Coffee Espresso Machine',
        image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6',
        description: 'Brew cafe-quality espresso at home with this premium machine featuring a milk frother and precision temperature control.',
        brand: 'BrewMaster',
        category: 'Appliances',
        price: 349.00,
        countInStock: 12,
        rating: 4.6,
        numReviews: 67,
        discount: 0
    },
    {
        name: 'Waterproof Bluetooth Speaker',
        image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1',
        description: 'Take your music anywhere with this rugged, waterproof Bluetooth speaker with 20 hours of battery life.',
        brand: 'SoundWave',
        category: 'Electronics',
        price: 59.99,
        countInStock: 100,
        rating: 4.5,
        numReviews: 320,
        discount: 10
    },
    {
        name: 'Professional Blender 1500W',
        image: 'https://images.unsplash.com/photo-1585237832863-71ba027d78df',
        description: 'Blend smoothies, soups, and more effortlessly with this high-powered professional 1500W blender.',
        brand: 'KitchenPro',
        category: 'Appliances',
        price: 129.50,
        countInStock: 20,
        rating: 4.7,
        numReviews: 115,
        discount: 0
    }
];

const importData = async () => {
    try {
        await connectDB();

        console.log('⏳ Clearing existing product data...');
        const deleteResult = await Product.deleteMany();
        console.log(`✅ Cleared ${deleteResult.deletedCount || 0} existing products.`);

        console.log('⏳ Inserting sample products...');
        const insertResult = await Product.insertMany(sampleProducts);
        console.log(`✅ Successfully inserted ${insertResult.length} new products!`);

        console.log('🎉 Data Seeding Completed Successfully!');
        process.exit(0);
    } catch (error) {
        console.error(`❌ Error seeding data: ${error.message}`);
        process.exit(1);
    }
};

// Run the seeder
importData();
