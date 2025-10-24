const settingSchema = new mongoose.Schema({
	key: { type: String, required: true, unique: true },
	value: { type: String, required: true }
});

export const Setting = mongoose.model('Setting', settingSchema);
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
	{
		name: { type: String, required: true },
		username: { type: String, required: true, unique: true, lowercase: true },
		passwordHash: { type: String, required: true },
		role: { type: String, enum: ['peserta', 'admin'], default: 'peserta' },
		hasVoted: { type: Boolean, default: false },
		votedCandidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' }
	},
	{ timestamps: true }
);

userSchema.methods.verifyPassword = function (password) {
	return bcrypt.compare(password, this.passwordHash);
};

const candidateSchema = new mongoose.Schema(
	{
		number: { type: Number, required: true, unique: true },
		name: { type: String, required: true },
		photoPath: { type: String },
		visi: { type: String, required: true },
		misi: { type: String, required: true },
		votes: { type: Number, default: 0 }
	},
	{ timestamps: true }
);

const voteSchema = new mongoose.Schema(
	{
		user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
		candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true }
	},
	{ timestamps: true }
);

export const User = mongoose.model('User', userSchema);
export const Candidate = mongoose.model('Candidate', candidateSchema);
export const Vote = mongoose.model('Vote', voteSchema);


