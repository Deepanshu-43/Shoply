import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import Product from './models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mern_shop';

const sampleProducts = [
  { name: 'Everyday Backpack', description: 'A lightweight backpack for daily essentials.', price: 1499, category: 'Accessories', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80', stock: 18 },
  { name: 'Wireless Headphones', description: 'Comfortable over-ear sound for work and travel.', price: 2499, category: 'Electronics', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80', stock: 12 },
  { name: 'Minimal Watch', description: 'A clean, timeless design for every occasion.', price: 3299, category: 'Accessories', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80', stock: 9 },
  { name: 'Ceramic Coffee Mug', description: 'A sturdy ceramic mug for your morning ritual.', price: 499, category: 'Home', image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=80', stock: 30 }
];

try {
  await mongoose.connect(mongoUri);
  await Product.deleteMany({});
  await Product.insertMany(sampleProducts);
  console.log('Sample products inserted.');
} catch (error) {
  console.error(error.message);
} finally {
  await mongoose.disconnect();
}
