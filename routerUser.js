const express = require('express');
const mongojs = require('mongojs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const bcrypt = require('bcryptjs');


const isUserAvailable = (email) => new Promise((resolve, reject) => {
    db.collection('user').findOne({ email }, function (err, reply) {
        if (reply) return resolve(true); // user exists
        return resolve(false); // user not exists
    })
})

router.post('/register', async function (req, res) {
    let email = req.body.email ? req.body.email : null;
    let password = req.body.password ? req.body.password : null;
    if (!email || !password) return res.send('Make sure your email & password has value!');

    let verifyAvailability = await isUserAvailable(email);
    if (verifyAvailability) return res.send(`User with email:${email} has already registered!`)

    let encryptedPassword = await bcrypt.hashSync(password, bcrypt.genSaltSync(10));

    let q = { email, password: encryptedPassword, level: 0 };

    db.collection('user').insert(q, function (err, reply) {
        if (err) return res.json(err);
        res.send("Successfully Registered!");
    });
});

router.get('/getcategory', async function (req, res) {
    db.collection('course').distinct('category', { deleted: { $exists: false } }, function (err, reply) {
        res.send({
            category: reply
        })
    })
});

router.get('/getpopularcategory', async function (req, res) {
    let aggregate = [];
    aggregate.push({
        $match: {
            deleted: { $exists: false }
        }
    })
    aggregate.push({
        $group: {
            _id: "$category",
            total_course: { $sum: 1 }
        }
    });
    aggregate.push({
        $sort: { _id: -1 }
    })
    aggregate.push({
        $project: {
            _id: 0,
            category: "$_id",
            total_course: 1
        }
    })
    db.collection('course').aggregate(aggregate, function (err, reply) {
        res.send(reply)
    })
});

router.get('/getcourse', async function (req, res) {
    let aggregate = [];
    let match = {}
    match.deleted = { $exists: false };
    if (req.query.title) { //SEARCH BY COURSE TITLE
        let title = new RegExp(req.query.title, "i");
        aggregate.push({
            $match: {
                title
            }
        })
    }
    aggregate.push({
        $project: {
            title: 1,
            category: 1,
            price: 1,
            deleted: 1
        }
    });
    if (req.query.price) { //PRICE SORTING
        let price = req.query.price == "asc" ? 1 : -1;
        aggregate.push({ $sort: { price } });
    }
    if (req.query.free) { //FILTER FREE
        if (req.query.free) {
            match.price = { $lte: 0 }
        }
    }

    aggregate.push({ $match: match });
    db.collection('course').aggregate(aggregate, function (err, reply) {
        res.send(reply)
    })
});

router.get('/getdetailcourse', async function (req, res) {
    if (!req.query._id) res.send("Error, failed to receive ID request");
    let q = {};
    q._id = mongojs.ObjectId(req.query._id);
    q.deleted = { $exists: false };
    db.collection('course').findOne(q, function (err, reply) {
        res.send(reply)
    })
})




module.exports = router;