const express = require('express')
const connectToDatabase = require('../models/db')
const jsonwebtoken = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const { validationResult } = require('express-validator')
const logger = require('../logger')

const router = express.Router()
router.post('/register', async (req, res) => {
  let db
  try {
    db = await connectToDatabase()
  } catch (e) {
    logger.error('Failed to connect to DB', e)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
  const collection = db.collection('users')
  const { email, password, firstName, lastName } = req.body
  // check if the credential already exists
  try {
    const prior_account = await collection.findOne({ email })
    console.log('prior_account:', prior_account)
    if (prior_account) {
      return res.status(400).json({ message: 'User already exists' })
    }
  } catch (e) {
    logger.error('Error checking existing user', e)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
  // insert the new user
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ message: 'Email and password are required' })
  }
  // Hash the password before storing it
  const hashedPassword = await bcrypt.hash(password, 10)
  const newUser = {
    email,
    hashedPassword,
    firstName,
    lastName,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  let insertResult
  try {
    insertResult = await collection.insertOne(newUser)
    if (!insertResult.acknowledged) {
      return res.status(500).json({ message: 'Failed to register user' })
    }
  } catch (e) {
    logger.error('Error inserting new user', e)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
  // setting the JWT token
  const jwtPayload = {
    user: {
      id: insertResult.insertedId
    }
  }
  try {
    const authToken = jsonwebtoken.sign(jwtPayload, process.env.JWT_SECRET, {
      expiresIn: '1h'
    })
    res.cookie('authToken', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict'
    })
  } catch (e) {
    logger.error('Error signing JWT', e)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
  return res.status(201).json({ message: 'User registered successfully' })
})
router.post('/login', async (req, res) => {
  try {
    temp = await connectToDatabase()
  } catch (e) {
    console.error('Failed to connect to DB', e)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
  const db = temp
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }
  const collection = db.collection('users')
  let temp
  try {
    temp = await collection.findOne({ email })
  } catch (e) {
    console.error('Error finding user', e)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
  const userResult = temp
  temp = null
  if (!userResult) {
    return res.status(400).json({ message: 'Invalid email or password' })
  }
  // Verify the password
  const isPasswordValid = await bcrypt.compare(
    password,
    userResult.hashedPassword
  )
  if (!isPasswordValid) {
    return res.status(400).json({ message: 'Invalid email or password' })
  }
  // Create JWT token
  const jwtPayload = {
    user: {
      id: userResult._id
    }
  }
  const authtoken = jsonwebtoken.sign(jwtPayload, process.env.JWT_SECRET, {
    expiresIn: '1h'
  })
  res.cookie('authToken', authtoken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict'
  })
  const userName = userResult.firstName
  const userEmail = userResult.email
  return res
    .status(200)
    .json({ authtoken, userName, userEmail })
})

router.put('/update', async (req, res) => {
  // Task 2: Validate the input using `validationResult` and return an appropriate message if you detect an error
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    logger.error('Validation errors', errors.array())
    return res.status(400).json({ errors: errors.array() })
  }
  try {
    // Task 3: Check if `email` is present in the header and throw an appropriate error message if it is not present
    const email = req.headers.email
    if (!email) {
      logger.error('Email header is missing')
      return res.status(400).json({ message: 'Email header is required' })
    }
    // Task 4: Connect to MongoDB
    let temp
    try {
      temp = await connectToDatabase()
    } catch (e) {
      logger.error('Failed to connect to database', e)
      return res.status(500).send('Internal server error')
    }
    const db = temp
    temp = null
    const collection = db.collection('users')
    // Task 5: Find the user credentials in database
    const existingUser = collection.findOne({ email })
    if (!existingUser) {
      logger.error('User not found', { email })
      return res.status(404).json({ message: 'User not found' })
    }
    if (!bcrypt.compare(req.body.password, existingUser.hashedPassword)) {
      logger.error('Incorrect password for user', { email })
      return res.status(400).json({ message: 'Incorrect password' })
    }
    existingUser.firstName = req.body.name || existingUser.firstName
    existingUser.updatedAt = new Date()
    // Task 6: Update the user credentials in the database
    collection.updateOne({ _id: existingUser._id }, { $set: existingUser })
    // Task 7: Create JWT authentication with `user._id` as a payload using the secret key from the .env file
    const jwtPayload = {
      user: {
        id: existingUser._id
      }
    }
    const authtoken = jsonwebtoken.sign(jwtPayload, process.env.JWT_SECRET, {
      expiresIn: '1h'
    })
    res.json({ authtoken })
  } catch (e) {
    logger.error('Error updating user', e)
    return res.status(500).send('Internal server error')
  }
})
module.exports = router
