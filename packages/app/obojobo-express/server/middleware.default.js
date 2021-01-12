const express = require('express')
const path = require('path')
const favicon = require('serve-favicon')
const bodyParser = require('body-parser')
const session = require('express-session')
const pgSession = require('connect-pg-simple')
const config = require('./config')
const compression = require('compression')
const logger = require('./logger')
const ObojoboDocumentServer = require('./obo_express')
const db = require('./db')
const IS_WEBPACK = process.env.IS_WEBPACK === 'true'
const engines = require('consolidate')

module.exports = app => {
	// =========== STATIC ASSET PATHS ================
	app.use(express.static(path.join(__dirname, 'public'))) // serve the files from public as static files
	app.use(compression()) // enable gzip compression
	app.disable('x-powered-by')

	// =========== VIEW ENGINES ================
	// register express-react-views template engine if not already registered
	if (!app.engines['ejs']) app.engine('ejs', engines.ejs)
	app.set('view engine', 'ejs') // set the default extension to ejs
	app.set('views', path.join(__dirname, 'views'))

	// =========== SET UP MIDDLEWARE ================
	app.use(favicon(path.join(__dirname, 'public', 'favicon-32.ico')))
	app.use(favicon(path.join(__dirname, 'public', 'favicon-128.ico')))
	app.use(favicon(path.join(__dirname, 'public', 'favicon-152.ico')))
	app.use(favicon(path.join(__dirname, 'public', 'favicon-167.ico')))
	app.use(favicon(path.join(__dirname, 'public', 'favicon-180.ico')))
	app.use(favicon(path.join(__dirname, 'public', 'favicon-192.ico')))
	app.use(favicon(path.join(__dirname, 'public', 'favicon-196.ico')))
	app.use(bodyParser.json(config.general.bodyParser.jsonOptions))
	app.use(bodyParser.urlencoded(config.general.bodyParser.urlencodedOptions))
	app.use(bodyParser.text(config.general.bodyParser.textOptions))

	app.use(
		session({
			store: new (pgSession(session))({
				pgPromise: db,
				tableName: 'sessions'
			}),
			secret: config.general.cookieSecret,
			resave: false,
			name: config.general.cookieName,
			saveUninitialized: false,
			rolling: true,
			cookie: {
				path: '/',
				maxAge: 10 * 24 * 60 * 60 * 1000, // 30 days
				// use config.general.secureCookie to determine the next settings
				// sameSite 'none' is needed to support LTI launches from different domains
				sameSite: config.general.secureCookie ? 'none' : false,
				httpOnly: !config.general.secureCookie,
				secure: !!config.general.secureCookie
			}
		})
	)
	app.use(ObojoboDocumentServer)

	// Custom Routes
	app.use('/profile', require('./routes/profile'))

	// 404 handler
	app.use((req, res, next) => {
		// lets requests for webpack stuff (in /static/) fall through
		// to webpack
		if (IS_WEBPACK && req.path.startsWith('/static')) {
			next()
			return
		}

		res.missing()
	})

	// unknown error handler
	app.use((err, req, res, next) => {
		logger.error('Unknown error', err)
		res.unexpected(err)
	})
}
