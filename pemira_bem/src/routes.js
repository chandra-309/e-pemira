import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import XLSX from 'xlsx';
import { User, Candidate, Vote, Setting } from './models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Admin edit settings

router.get('/admin/settings', ensureAdmin, async (req, res) => {
	const title = await Setting.findOne({ key: 'title' });
	const subtitle = await Setting.findOne({ key: 'subtitle' });
	const orgName = await Setting.findOne({ key: 'orgName' });
	res.render('admin/settings', {
		title: title ? title.value : '',
		subtitle: subtitle ? subtitle.value : '',
		orgName: orgName ? orgName.value : 'BEM',
		csrfToken: req.csrfToken ? req.csrfToken() : '',
		flash: req.flash()
	});
});

router.post('/admin/settings', ensureAdmin, async (req, res) => {
	const { title, subtitle, orgName } = req.body;
	await Setting.findOneAndUpdate(
		{ key: 'title' },
		{ value: title },
		{ upsert: true }
	);
	await Setting.findOneAndUpdate(
		{ key: 'subtitle' },
		{ value: subtitle },
		{ upsert: true }
	);
	await Setting.findOneAndUpdate(
		{ key: 'orgName' },
		{ value: orgName },
		{ upsert: true }
	);
	req.flash('success', 'Pengaturan berhasil disimpan!');
	res.redirect('/admin/settings');
});

const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'public', 'uploads')),
	filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

function ensureAuth(req, res, next) {
	if (!req.session.user) return res.redirect('/login');
	next();
}

function ensureAdmin(req, res, next) {
	if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/');
	next();
}

router.get('/', async (req, res) => {
       const titleSetting = await Setting.findOne({ key: 'title' });
       const subtitleSetting = await Setting.findOne({ key: 'subtitle' });
       const orgNameSetting = await Setting.findOne({ key: 'orgName' });
       res.render('index', {
	       title: titleSetting ? titleSetting.value : 'E-Pemira',
	       subtitle: subtitleSetting ? subtitleSetting.value : 'Pemilihan Raya Ketua BEM Periode 2026/2027',
	       orgName: orgNameSetting ? orgNameSetting.value : 'BEM',
	       flash: req.flash()
       });
});

router.get('/login', async (req, res) => {
	if (req.session.user) return res.redirect('/voting');
	// load editable settings so login page reflects admin changes
	const titleSetting = await Setting.findOne({ key: 'title' });
	const subtitleSetting = await Setting.findOne({ key: 'subtitle' });
	const orgNameSetting = await Setting.findOne({ key: 'orgName' });
	res.render('auth/login', {
		title: titleSetting ? titleSetting.value : 'E-Pemira',
		subtitle: subtitleSetting ? subtitleSetting.value : 'Pemilihan Raya Ketua BEM Periode 2026/2027',
		orgName: orgNameSetting ? orgNameSetting.value : 'BEM',
		csrfToken: req.csrfToken ? req.csrfToken() : '',
		flash: req.flash()
	});
});

router.post('/login', async (req, res) => {
	const { username, password } = req.body;
	const user = await User.findOne({ username });
	if (!user) {
		req.flash('error', 'username atau password salah');
		return res.redirect('/login');
	}
	const ok = await user.verifyPassword(password);
	if (!ok) {
		req.flash('error', 'username atau password salah');
		return res.redirect('/login');
	}
	req.session.user = { id: user._id, name: user.name, role: user.role };
	if (user.role === 'admin') return res.redirect('/admin');
	res.redirect('/voting');
});

router.post('/logout', (req, res) => {
	req.session.destroy(() => {
		res.redirect('/');
	});
});

router.get('/voting', ensureAuth, async (req, res) => {
	// Admin tidak bisa vote
	if (req.session.user.role === 'admin') {
		req.flash('error', 'Admin tidak dapat melakukan voting');
		return res.redirect('/admin');
	}
	const user = await User.findById(req.session.user.id);
	const candidates = await Candidate.find({}).sort({ number: 1 });
	const orgNameSetting = await Setting.findOne({ key: 'orgName' });
	res.render('voting/list', { candidates, user, orgName: orgNameSetting ? orgNameSetting.value : 'BEM' });
});

router.get('/voting/confirm/:id', ensureAuth, async (req, res) => {
	// Admin tidak bisa vote
	if (req.session.user.role === 'admin') {
		req.flash('error', 'Admin tidak dapat melakukan voting');
		return res.redirect('/admin');
	}
	const user = await User.findById(req.session.user.id);
	if (user.hasVoted) return res.redirect('/voting');
	const candidate = await Candidate.findById(req.params.id);
	if (!candidate) return res.redirect('/voting');
	res.render('voting/confirm', { candidate });
});

router.post('/voting', ensureAuth, async (req, res) => {
	// Admin tidak bisa vote
	if (req.session.user.role === 'admin') {
		req.flash('error', 'Admin tidak dapat melakukan voting');
		return res.redirect('/admin');
	}
	const user = await User.findById(req.session.user.id);
	if (user.hasVoted) {
		req.flash('error', 'Anda sudah melakukan voting');
		return res.redirect('/voting');
	}
	const candidate = await Candidate.findById(req.body.candidateId);
	if (!candidate) {
		req.flash('error', 'Kandidat tidak ditemukan');
		return res.redirect('/voting');
	}
	await Vote.create({ user: user._id, candidate: candidate._id });
	user.hasVoted = true;
	user.votedCandidate = candidate._id;
	candidate.votes += 1;
	await Promise.all([user.save(), candidate.save()]);
	req.flash('success', 'Terima kasih, suara Anda telah direkam.');
	res.redirect('/voting');
});

router.get('/admin', ensureAdmin, async (req, res) => {
	const totalVoters = await User.countDocuments({ role: 'peserta' });
	const totalVoted = await Vote.countDocuments();
	const orgNameSetting = await Setting.findOne({ key: 'orgName' });
	res.render('admin/dashboard', { totalVoters, totalVoted, orgName: orgNameSetting ? orgNameSetting.value : 'BEM' });
});

router.get('/admin/students', ensureAdmin, async (req, res) => {
	const users = await User.find({ role: 'peserta' }).populate('votedCandidate');
	res.render('admin/students', { users });
});

// CRUD Routes for Students
router.get('/admin/students/new', ensureAdmin, (req, res) => {
	res.render('admin/student_form', { student: null });
});

router.post('/admin/students', ensureAdmin, async (req, res) => {
	const { name, username, password, role } = req.body;
	try {
		const passwordHash = await bcrypt.hash(password, 10);
		await User.create({
			name,
			username,
			passwordHash,
			role: role || 'peserta'
		});
		req.flash('success', 'Mahasiswa berhasil ditambahkan');
		res.redirect('/admin/students');
	} catch (error) {
		req.flash('error', 'Username sudah digunakan');
		res.redirect('/admin/students/new');
	}
});

router.get('/admin/students/:id/edit', ensureAdmin, async (req, res) => {
	const student = await User.findById(req.params.id);
	if (!student || student.role !== 'peserta') return res.redirect('/admin/students');
	res.render('admin/student_form', { student });
});

router.put('/admin/students/:id', ensureAdmin, async (req, res) => {
	const { name, username, password, role } = req.body;
	const student = await User.findById(req.params.id);
	if (!student || student.role !== 'peserta') return res.redirect('/admin/students');
	
	student.name = name;
	student.username = username;
	if (password) {
		student.passwordHash = await bcrypt.hash(password, 10);
	}
	student.role = role || 'peserta';
	
	try {
		await student.save();
		req.flash('success', 'Data mahasiswa berhasil diperbarui');
		res.redirect('/admin/students');
	} catch (error) {
		req.flash('error', 'Username sudah digunakan');
		res.redirect(`/admin/students/${req.params.id}/edit`);
	}
});

router.post('/admin/students/:id/delete', ensureAdmin, async (req, res) => {
	const student = await User.findById(req.params.id);
	if (student && student.role === 'peserta') {
		await Vote.deleteMany({ user: req.params.id });
		await User.findByIdAndDelete(req.params.id);
		req.flash('success', 'Mahasiswa berhasil dihapus');
	}
	res.redirect('/admin/students');
});

router.get('/admin/candidates', ensureAdmin, async (req, res) => {
	const candidates = await Candidate.find({}).sort({ number: 1 });
	const orgNameSetting = await Setting.findOne({ key: 'orgName' });
	res.render('admin/candidates', { candidates, orgName: orgNameSetting ? orgNameSetting.value : 'BEM' });
});

router.get('/admin/candidates/new', ensureAdmin, (req, res) => {
	res.render('admin/candidate_form', { candidate: null });
});

router.post('/admin/candidates', ensureAdmin, upload.single('photo'), async (req, res) => {
	const { number, name, visi, misi } = req.body;
	await Candidate.create({
		number,
		name,
		visi,
		misi,
		photoPath: req.file ? `/uploads/${req.file.filename}` : undefined
	});
	res.redirect('/admin/candidates');
});

router.get('/admin/candidates/:id/edit', ensureAdmin, async (req, res) => {
	const candidate = await Candidate.findById(req.params.id);
	if (!candidate) return res.redirect('/admin/candidates');
	res.render('admin/candidate_form', { candidate });
});

router.put('/admin/candidates/:id', ensureAdmin, upload.single('photo'), async (req, res) => {
	const { number, name, visi, misi } = req.body;
	const candidate = await Candidate.findById(req.params.id);
	if (!candidate) return res.redirect('/admin/candidates');
	candidate.number = number;
	candidate.name = name;
	candidate.visi = visi;
	candidate.misi = misi;
	if (req.file) candidate.photoPath = `/uploads/${req.file.filename}`;
	await candidate.save();
	res.redirect('/admin/candidates');
});

// POST route untuk update (fallback)
router.post('/admin/candidates/:id', ensureAdmin, upload.single('photo'), async (req, res) => {
	const { number, name, visi, misi } = req.body;
	const candidate = await Candidate.findById(req.params.id);
	if (!candidate) return res.redirect('/admin/candidates');
	candidate.number = number;
	candidate.name = name;
	candidate.visi = visi;
	candidate.misi = misi;
	if (req.file) candidate.photoPath = `/uploads/${req.file.filename}`;
	await candidate.save();
	res.redirect('/admin/candidates');
});

router.post('/admin/candidates/:id/delete', ensureAdmin, async (req, res) => {
	await Candidate.findByIdAndDelete(req.params.id);
	await Vote.deleteMany({ candidate: req.params.id });
	res.redirect('/admin/candidates');
});

router.get('/admin/stats', ensureAdmin, async (req, res) => {
	const candidates = await Candidate.find({}).sort({ number: 1 });
	const orgNameSetting = await Setting.findOne({ key: 'orgName' });
	res.render('admin/stats', { candidates, orgName: orgNameSetting ? orgNameSetting.value : 'BEM' });
});

// Reset Data Route
router.post('/admin/reset-data', ensureAdmin, async (req, res) => {
	try {
		// Reset semua vote
		await Vote.deleteMany({});
		
		// Reset status voting semua user
		await User.updateMany({}, { 
			$unset: { hasVoted: 1, votedCandidate: 1 },
			$set: { hasVoted: false }
		});
		
		// Reset vote count semua kandidat
		await Candidate.updateMany({}, { $set: { votes: 0 } });
		
		req.flash('success', 'Data voting berhasil direset!');
		res.redirect('/admin/stats');
	} catch (error) {
		req.flash('error', 'Gagal reset data: ' + error.message);
		res.redirect('/admin/stats');
	}
});

// Export to Excel Route
router.get('/admin/export-excel', ensureAdmin, async (req, res) => {
	try {
		// Get all candidates with vote counts
		const candidates = await Candidate.find({}).sort({ number: 1 });
		
		// Get all votes with user and candidate details
		const votes = await Vote.find({})
			.populate('user', 'name username')
			.populate('candidate', 'number name')
			.sort({ createdAt: 1 });

		// Create workbook
		const workbook = XLSX.utils.book_new();

		// Sheet 1: Summary Statistics
		const summaryData = [
			['LAPORAN HASIL PEMILIHAN KETUA BEM'],
			['Akademi Komunitas Negeri Putra Sang Fajar Blitar'],
			['Periode: 2026/2027'],
			['Tanggal Export:', new Date().toLocaleDateString('id-ID')],
			['Waktu Export:', new Date().toLocaleTimeString('id-ID')],
			[''],
			['RINGKASAN HASIL PEMILIHAN'],
			[''],
			['No Urut', 'Nama Kandidat', 'Jumlah Suara', 'Persentase (%)'],
		];

		const totalVotes = candidates.reduce((sum, candidate) => sum + candidate.votes, 0);
		
		candidates.forEach(candidate => {
			const percentage = totalVotes > 0 ? ((candidate.votes / totalVotes) * 100).toFixed(2) : '0.00';
			summaryData.push([
				candidate.number,
				candidate.name,
				candidate.votes,
				percentage
			]);
		});

		summaryData.push(['']);
		summaryData.push(['TOTAL SUARA:', totalVotes]);
		summaryData.push(['TOTAL PEMILIH:', votes.length]);
		summaryData.push(['TOTAL KANDIDAT:', candidates.length]);

		const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
		XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');

		// Sheet 2: Detail Voting
		const detailData = [
			['DETAIL DATA PEMILIHAN'],
			['Akademi Komunitas Negeri Putra Sang Fajar Blitar'],
			['Periode: 2026/2027'],
			[''],
			['No', 'Nama Pemilih', 'Username', 'Kandidat Dipilih', 'Nomor Urut', 'Tanggal Voting', 'Waktu Voting']
		];

		votes.forEach((vote, index) => {
			const voteDate = new Date(vote.createdAt);
			detailData.push([
				index + 1,
				vote.user.name,
				vote.user.username,
				vote.candidate.name,
				vote.candidate.number,
				voteDate.toLocaleDateString('id-ID'),
				voteDate.toLocaleTimeString('id-ID')
			]);
		});

		const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
		XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detail Voting');

		// Sheet 3: Candidate Information
		const candidateData = [
			['INFORMASI KANDIDAT'],
			['Akademi Komunitas Negeri Putra Sang Fajar Blitar'],
			['Periode: 2026/2027'],
			[''],
			['No Urut', 'Nama Kandidat', 'Visi', 'Misi', 'Jumlah Suara']
		];

		candidates.forEach(candidate => {
			candidateData.push([
				candidate.number,
				candidate.name,
				candidate.visi,
				candidate.misi,
				candidate.votes
			]);
		});

		const candidateSheet = XLSX.utils.aoa_to_sheet(candidateData);
		XLSX.utils.book_append_sheet(workbook, candidateSheet, 'Info Kandidat');

		// Generate filename with current date and time
		const now = new Date();
		const dateStr = now.toISOString().split('T')[0];
		const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
		const filename = `Laporan_Pemira_BEM_${dateStr}_${timeStr}.xlsx`;

		// Set headers for download
		res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

		// Write workbook to response
		const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
		res.send(buffer);

	} catch (error) {
		req.flash('error', 'Gagal export data: ' + error.message);
		res.redirect('/admin/stats');
	}
});

export default router;


