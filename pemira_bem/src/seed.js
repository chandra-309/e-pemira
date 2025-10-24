import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Candidate } from './models.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pemira';

async function run() {
	await mongoose.connect(MONGO_URI);
	await Promise.all([
		User.deleteMany({}),
		Candidate.deleteMany({})
	]);

	const admin = await User.create({
		name: 'Admin',
		username: 'admin',
		passwordHash: await bcrypt.hash('admin123', 10),
		role: 'admin'
	});

	const peserta = await User.create({
		name: 'Peserta 1',
		username: 'peserta1',
		passwordHash: await bcrypt.hash('peserta123', 10),
		role: 'peserta'
	});

	await Candidate.create([
		{ number: 1, name: 'Paslon 1', visi: 'Mewujudkan kampus unggul', misi: 'Transparansi, inovasi, kolaborasi', photoPath: '' },
		{ number: 2, name: 'Paslon 2', visi: 'Kampus berdaya saing', misi: 'Pelayanan, prestasi, integritas', photoPath: '' }
	]);

	console.log('Seed completed');
	await mongoose.disconnect();
}

run().catch((e) => {
	console.error(e);
	process.exit(1);
});


