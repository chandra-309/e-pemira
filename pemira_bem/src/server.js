import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import methodOverride from 'method-override';
import csrf from 'csurf';
import flash from 'connect-flash';
import mongoose from 'mongoose';
import routes from './routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pemira';
const SESSION_SECRET = process.env.SESSION_SECRET || 'supersecret';

await mongoose.connect(MONGO_URI);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(
	session({
		secret: SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		cookie: { maxAge: 1000 * 60 * 60 * 4 },
		store: MongoStore.create({ mongoUrl: MONGO_URI })
	})
);

const csrfProtection = csrf();
// Skip CSRF for admin routes
app.use((req, res, next) => {
	if (req.path.startsWith('/admin/')) {
		return next();
	}
	csrfProtection(req, res, next);
});
app.use(flash());

app.use((req, res, next) => {
	try {
		res.locals.csrfToken = req.csrfToken();
	} catch (err) {
		// CSRF token tidak tersedia untuk beberapa route
		res.locals.csrfToken = '';
	}
	res.locals.user = req.session.user || null;
	res.locals.flash = {
		success: req.flash('success'),
		error: req.flash('error')
	};
	next();
});

app.use('/', routes);

app.use((err, req, res, next) => {
	console.error(err);
	if (err.code === 'EBADCSRFTOKEN') {
		return res.status(403).send('Invalid CSRF token');
	}
	res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});


