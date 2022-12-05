const { client } = require('./lib/router');
const slimeDB = require('slimedb');
const fs = require('fs');
const md5 = require('md5');
const short = require('shortid');
const { google } = require('googleapis');
const GOOGLE_API_FOLDER_ID = '1-sQEbClcbj6xmywa5XygM3wWfGCWWF69';

const member = new slimeDB('member').createTable({
  id: slimeDB.DataType.PRIMARY,
  root: slimeDB.DataType.VARCHAR,
  email: slimeDB.DataType.VARCHAR,
  username: slimeDB.DataType.VARCHAR,
  password: slimeDB.DataType.VARCHAR,
  timestamp: slimeDB.DataType.NUMBER,
  created: slimeDB.DataType.DATETIME
});

client.post('/api/v1/files/create', async ( req, res ) => {
  const pathName = './stream/' + short.generate() + '.stream';
  fs.writeFileSync(pathName, req.body.image, { encoding:'base64' });
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: './google.json',
      scopes: ['https://www.googleapis.com/auth/drive']
    })
    const driveService = google.drive({
      version: 'v3',
      auth
    })
    const fileMetaData = {
      'name': `${ new Date().getTime() }`,
      'parents': [GOOGLE_API_FOLDER_ID]
    }
    const media = {
      mimeType: req.body.mimeType,
      body: fs.createReadStream(pathName)
    }
    const response = await driveService.files.create({
      resource: fileMetaData,
      media: media,
      field: 'id'
    })
    res.json({
      id: response.data.id,
      name: req.body.name
    })
  } catch(err) {
    res.status(403).json({
        message: err
    })
  }
  fs.unlinkSync(pathName);
});

client.post('/api/v1/files/delete', async ( req, res ) => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: './google.json',
      scopes: ['https://www.googleapis.com/auth/drive']
    })
    const driveService = google.drive({
      version: 'v3',
      auth
    })
    const response = await driveService.files.delete({
      fileId: req.body.id
    })
    res.json({
      id: req.body.id,
    })
  } catch(err) {
    res.status(403).json({
      message: err
    })
  }
});

// set home page
client.get('/', ( req, res ) => {
  req.flash('login', req.session.login);
  req.flash('username', req.session.username);
  req.flash('homePath', `/${req.session.username}/`);
  req.flash('dashboard', req.session.dashboard);
  res.render('index');
})

// set upload page
client.get('/:username/dashboard/upload/:id', ( req, res ) => {
  if ( !req.session.login || req.session.username != req.params.username ) return res.redirect( `/${req.params.username}/` );
  res.render('upload');
})
client.post('/:username/dashboard/upload/:id', ( req, res ) => {
  if ( !req.session.login || req.session.username != req.params.username ) return res.status( 403 );
  let data = {
    id: short.generate(),
    manga_id: req.params.id,
    images: req.body.images
  }
  slimeDB.insert( chapter, data );
  res.json({
    message: "success",
    data: req.body
  });
})

// set register page
client.get('/register', ( req, res ) => {
  if ( req.session.login ) return res.redirect( req.session.dashboard );
  req.session.status = 'register';
  res.render('register');
})
client.post('/register', ( req, res ) => {
  if ( req.session.login ) return res.redirect( req.session.dashboard );
  if ( !req.body.email || !req.body.username || !req.body.password || req.session.status !== 'register' ) return res.redirect('./');
  let email = req.body.email;
  let username = req.body.username.toLowerCase();
  let password = req.body.password;
  let isExists = false;
  slimeDB.query( member, table => {
    let existsUsername = table.find( i => i.username == username );
    let existsEmail = table.find( i => i.email == email );
    if ( existsUsername ) {
      req.flash('error', 'username');
      isExists = true
    }
    if ( existsEmail ) {
      req.flash('error', 'email');
      isExists = true
    }
    if ( !isExists ) {
      slimeDB.insert( member, {
        root: password,
        email, email,
        username: username,
        password: md5( password ),
        timestamp: new Date().getTime()
      });
      req.session.login = true;
      req.session.username = username;
      req.session.dashboard = `/${username}/dashboard/`;
      req.session.timestamp = new Date().getTime();
      res.redirect( req.session.dashboard );
    } else {
      req.flash('email', email);
      req.flash('username', username);
      req.flash('password', password);
    }
  })
  isExists && res.render('register');
})

// set login page
client.get('/login', ( req, res ) => {
  if ( req.session.login ) return res.redirect( req.session.dashboard );
  req.session.status = 'login';
  res.render('login');
})
client.post('/login', ( req, res ) => {
  if ( req.session.login ) return res.redirect( req.session.dashboard );
  if ( !req.body.username || !req.body.password || req.session.status !== 'login' ) return res.redirect('./');
  let username = req.body.username.toLowerCase();
  let password = req.body.password;
  let loginNotSuccess = false;
  slimeDB.query( member, table => {
    let isResult = table.find( i => i.username == username );
    if ( !isResult ) {
      req.flash('error', 'username');
      loginNotSuccess = true
    }
    if ( isResult && isResult.password !== md5( password ) ) {
      req.flash('error', 'password');
      loginNotSuccess = true
    }
    if ( !loginNotSuccess ) {
      req.session.login = true;
      req.session.username = username;
      req.session.dashboard = `/${username}/dashboard/`;
      req.session.timestamp = new Date().getTime();
      res.redirect( req.session.dashboard );
    } else {
      req.flash('username', username);
      req.flash('password', password);
    }
  });
  loginNotSuccess && res.render('login');
});

// set page not be found
client.get('*', ( req, res ) => {
  res.status(404).render('404')
});
client.post('*', ( req, res ) => {
  res.status(404).render('404')
});
