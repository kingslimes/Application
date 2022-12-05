const
    path = require('path'),
    express = require('express'),
    flash = require('express-flash'),
    session = require('express-session'),
    cookieParser = require('cookie-parser');


const client = express();
client.use( express.static( path.join(__dirname, '../static/') ) );
client.use(
    session({
        resave: true,
        secret: 'kingslimes',
        saveUninitialized: true,
        cookie: { maxAge: 60000*24 },
        store: new session.MemoryStore
    })
);
client.use(
    express.urlencoded({
        extended: true,
        limit: '50gb'
    })
);
client.use( cookieParser() );
client.use( express.json({ limit:'50gb' }) );
client.use( flash() );
client.enable( 'trust proxy' );
client.set( 'views', path.join(__dirname, '../public') );
client.set( 'view engine', 'ejs' );

client.listen( 8080, function() {
    console.log(`[INFO] express.js listen (http://localhost:${ this.address().port }) ${ new Date().toLocaleString() }`)
})
module.exports = { client }