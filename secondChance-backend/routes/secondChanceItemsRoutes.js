const express = require('express');
const multer = require('multer');
const router = express.Router();
const connectToDatabase = require('../models/db');
const logger = require('../logger');
const { ReturnDocument } = require('mongodb');

// Define the upload directory path
const directoryPath = 'public/images';

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, directoryPath); // Specify the upload directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name
  },
});

const upload = multer({ storage: storage });


// Get all secondChanceItems
router.get('/', async (req, res, next) => {
    logger.info('/ called');
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        const secondChanceItems = await collection.find({}).toArray();
        res.status(200).json(secondChanceItems);
    } catch (e) {
        console.error('oops something went wrong', e)
        next(e);
    }
});

// Add a new item
router.post('/', upload.single('file'),async(req, res,next) => {
    try {
        
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        const secondChanceItem = req.body;
        const new_id = collection.find().sort({id:-1}).limit(1).toArray()[0]['_id'] + 1;
        const date_added = Math.floor(new Date().getTime() / 1000);
        secondChanceItem.id = new_id;
        secondChanceItem.date_added = date_added;
        await collection.insertOne(secondChanceItem);

        res.status(201).json(secondChanceItem.ops[0]);
    } catch (e) {
        next(e);
    }
});

// Get a single secondChanceItem by ID
router.get('/:id', async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        const id = req.params.id;
        console.log(id)
        console.log(typeof id)
        const secondChanceItem = await collection.findOne({ id: id });
        if (!secondChanceItem) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.status(200).json(secondChanceItem);
    } catch (e) {
        next(e);
    }
});

// Update and existing item
router.put('/:id', async(req, res) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        const id = req.params.id;
        const exist = collection.findOne({ id: id });
        if (!exist) {
            return res.status(404).json({ message: 'Item not found' });
        }
        const updatedItem = req.body;
        var secondChanceItem = {};
        secondChanceItem.category = req.body.category;
        secondChanceItem.condition = req.body.condition;
        secondChanceItem.age_days = req.body.age_days;
        secondChanceItem.description = req.body.description;
        secondChanceItem.age_years = Number((secondChanceItem.age_days/365).toFixed(1));
        secondChanceItem.updatedAt = new Date();

        const updatePreloveItem = await collection.findOneAndUpdate(
            { id: id},
            { $set: updatedItem },
            {ReturnDocument: ReturnDocument.AFTER }
        )
        if (!updatePreloveItem) {
            return res.status(404).json({ message: 'Item not found' });
        }
        return res.status(200).json(updatePreloveItem.value);
    } catch (e) {
        logger.error('Error updating item', e);
    }
});

// Delete an existing item
router.delete('/:id', async(req, res) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        const id = req.params.id;
        const result = await collection.deleteOne({ id: id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.status(204).send();
    } catch (e) {
        logger.error('Error deleting item', e);
    }
});

module.exports = router;
