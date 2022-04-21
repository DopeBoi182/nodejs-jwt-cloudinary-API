const express = require('express');
const mongojs = require('mongojs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const courseStats = () => new Promise((resolve, reject) => {
    let free_courses, total_courses, total_course_nominal;

    let aggregate = [
        { $match: { deleted: { $exists: false } } },
        {
            $group: {
                _id: null,
                total_price: { $sum: "$price" },
                total_course: { $sum: 1 }
            }
        }
    ]
    db.collection('course').find({ price: { $lte: 0 } }, function (err, reply) {
        free_courses = reply.length;
        db.collection('course').aggregate(aggregate, function (err, reply) {
            total_course_nominal = reply[0].total_price;
            total_courses = reply[0].total_course;
            return resolve({ free_courses, total_course_nominal, total_courses })
        })
    });
})

const userStats = () => new Promise((resolve, reject) => {
    let total_user;
    db.collection('user').find({ level: 0 }, function (err, reply) {
        total_user = reply.length;
        return resolve(total_user);
    })
})
const getStatistic = () => new Promise(async (resolve, reject) => {
    let course = await courseStats();
    let user = await userStats();
    return resolve({ course, user });
})

router.post('/createcourse', async function (req, res) {
    let title = req.body.title ? req.body.title : null;
    let category = req.body.category ? req.body.category.toUpperCase() : null;
    let value = req.body.value ? req.body.value : null;
    let price = req.body.price ? parseFloat(req.body.price) : null;

    if (!title || !category || !value || !price) return res.send("Make sure you have filled all the form available!");

    let q = { title, category, value, price };
    db.collection('course').insert(q, function (err, reply) {
        if (err) res.json(err);
        if (reply) {
            return res.send("Successfully Inserted New Course!")
        } else {
            return res.send("Error Failed To Insert New Course!")
        }
    })
});

router.get('/getcourse', async function (req, res) {
    let aggregate = [];
    let val = {};
    val.deleted = { $exists: false }

    if (req.query) { //SEARCH BY COURSE TITLE
        let query = req.query;
        let val = {}
        for (var key in query) {
            if (key != "price") {
                val[key] = new RegExp(query[key], "i");
            }
            if (key == "price") {
                val.price = parseFloat(query.price);
            }
        }
    }
    aggregate.push({ $match: val })
    aggregate.push({
        $project: {
            _id: 1,
            title: 1,
            category: 1,
            price: 1
        }
    });
    if (req.query.price) { //PRICE SORTING
        let price = req.query.price == "asc" ? 1 : -1;
        aggregate.push({ $sort: { price } });
    }
    if (req.query.free) { //FILTER FREE
        if (req.query.free) {
            aggregate.push({ $match: { price: { $lte: 0 } } });
        }
    }

    db.collection('course').aggregate(aggregate, function (err, reply) {
        return res.send(reply)
    })
});

router.post('/updatecourse', async function (req, res) {
    if (!req.body._id) return res.send("Failed to receive course {ID}");

    let q = {};
    q._id = mongojs.ObjectId(req.body._id);

    let update = {};
    let updateSent = req.body;
    for (var key in updateSent) {
        if (key != '_id' && key != 'price') {
            update[key] = updateSent[key]
        }
        if (key == 'price') {
            update.price = parseFloat(updateSent[key]);
        }
    }
    db.collection('course').update(q, { $set: update }, function (err, reply) {
        if (err) return res.send("Failed to update course!");
        return res.send(`Course ID:${q._id} has successfully updated!`);
    })
});

router.post('/deletecourse', async function (req, res) {
    if (!req.body._id) return res.send("Failed to receive course {ID}");

    let q = {};
    q._id = mongojs.ObjectId(req.body._id);

    let deleted = {
        timestamp: new Date()
    }
    db.collection('course').update(q, { $set: { deleted } }, function (err, reply) {
        if (err) return res.send("Failed to update course!");
        return res.send(`Course ID:${q._id} has successfully updated!`);
    })
})

router.get('/getstatistic', async function (req, res) {
    let stats = await getStatistic();
    let result = {};
    result.total_user = stats.user;
    result.total_course = stats.course.total_courses;
    result.total_course_nominal = stats.course.total_course_nominal;
    result.total_course_free = stats.course.free_courses;
    return res.json(result);
});
module.exports = router;