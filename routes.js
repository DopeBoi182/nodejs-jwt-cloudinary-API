const express = require('express');
const mongojs = require('mongojs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const bcrypt = require('bcryptjs');

const verifyToken = (req, res, next) => {
	const bearerHeader = req.headers["authorization"];
	if (typeof bearerHeader !== "undefined") {
		const bearer = bearerHeader.split(" ");
		const token = bearer[1];
		req.token = token;
		next();
	} else {
		res.sendStatus(403).json({
			message: "Token Invalid"
		})
	}

}

router.get('/', async function (req, res) {
	let name = "kaka";
	let crypt = await bcrypt.hashSync(name, bcrypt.genSaltSync(10));
	let compare = bcrypt.compareSync('wkwkw', crypt);

	console.log(`name : ${name}`)
	console.log(`cryp : ${crypt}`)
	console.log(`result: ${compare}`);
	res.send('API Elemes.id')
});

router.post('/api/login', async (req, res) => {
	const user = { id: 1 };
	const token = jwt.sign({ user }, 'key');
	res.json({
		token
	})
})

router.get('/api/protected', verifyToken, async (req, res) => {
	jwt.verify(req.token, "key", function (err, data) {
		if (err) {
			res.sendStatus(403);
		} else {
			res.json({
				message: 'PROTECTED',
				data
			})
		}
	})
})

router.get('/getpost', async (req, res) => {
	let query = {}

	db.collection('posts').find(query, function (err, reply) {
		if (err) {
			console.log(err);
		}
		else {
			console.log(reply);
			res.json(reply);
		}
	});
});
module.exports = router;