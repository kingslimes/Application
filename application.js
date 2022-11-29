const { client } = require('./lib/router');

client.get('*', ( req, res ) => {
    res.render('404');
});