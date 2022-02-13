const express = require("express");
const mongojs = require("mongojs");
const routerAdmin = require('./routerAdmin.js');
const routerUser = require('./routerUser.js');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: 'dnpsoqozw',
  api_key: '495343594564512',
  api_secret: 'eOpNboPQ-g-qkynIKmysw-zJ5cw'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'images'
  }
})

const upload = multer({ storage: storage });

const verifyToken = (req, res, next) => {
  const bearerHeader = req.headers["authorization"];
  if (typeof bearerHeader !== "undefined") {
    const bearer = bearerHeader.split(" ");
    const token = bearer[1];
    req.token = token;
    jwt.verify(req.token, "key", function (err, data) {
      if (err) {
        return res.sendStatus(403);
      } else {
        next();
      }
    })
  } else {
    return res.send("Token Invalid")
  }
}

const verifyAdmin = (req, res, next) => {
  db.collection('session').findOne({ token: req.token }, function (err, reply) {
    if (reply.level == 1) { next() }
    else { return res.sendStatus(403) }
  })
}
const app = express();

var databaseUrl = "elemes";

global.db = mongojs(databaseUrl);

db.on("error", function (error) {
  console.log("Database Error:", error);
});

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

// Upload Images
app.post('/upload', upload.single('picture'), (req, res) => {
  return res.json({ picture: req.file.path });
})

// Routes
app.use('/login', async (req, res) => {
  let email = req.body.email ? req.body.email : null;
  let password = req.body.password ? req.body.password : null;
  if (!email || !password) res.send("Fill the email and password form!");
  let q = { email };
  db.collection('user').findOne(q, async function (err, reply) {
    if (!reply) return res.send("User not registered!");
    const checkPasswordValidation = await bcrypt.compare(password, reply.password);
    if (checkPasswordValidation) {
      const user = { id: reply._id.toString(), level: reply.level, email: reply.email };
      const token = jwt.sign(user, 'key', { expiresIn: '1h' });
      const result = {
        token, email: reply.email, level: reply.level
      }
      db.collection('session').insert(result, function (err, reply) {

        return res.json({
          result
        })
      })
    } else {
      return res.send("Invalid Password");
    }
  })
});

app.use('/logout', verifyToken, function (req, res) {
  db.collection('session').remove({ token: req.token }, function (err, reply) {
    res.send("Successfully Logged Out!")
  })
})

app.use('/user', verifyToken, routerUser)
app.use('/admin', verifyToken, verifyAdmin, routerAdmin)

app.listen(5000, function () {
  console.log('listening on 5000')
})