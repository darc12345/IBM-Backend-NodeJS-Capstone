const express = require("express");
const connectToDatabase = require("../models/db");
const jsonwebtoken = require("jsonwebtoken");
const bcrypt = require("bcrypt");


const router = express.Router();
router.post("/register", async (req, res, next) => {
  try {
    db = await connectToDatabase();
  } catch (e) {
    console.error("Failed to connect to DB", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
  const collection = db.collection("users");
  const { email, password, firstName, lastName } = req.body;
  //check if the credential already exists
  try {
    let prior_account = await collection.findOne({ email: email });
    if (Object.keys(prior_account).length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }
  } catch (e) {
    console.error("Error checking existing user", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
  //insert the new user
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  // Hash the password before storing it
  hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { 
    email:email,
    hashedPassword: hashedPassword,
    firstName: firstName,
    lastName: lastName,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  let insertResult;
  try {
    insertResult = await collection.insertOne(newUser);
    if (!insertResult.acknowledged) {
      return res.status(500).json({ message: "Failed to register user" });
    }
  } catch (e) {
    console.error("Error inserting new user", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
  //setting the JWT token
  const jwtPayload = {
    user: {
      id: insertResult.insertedId,
    },
  };
  try{
    const authToken = jsonwebtoken.sign(
      jwtPayload,
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.cookie("authToken", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });
  } catch (e) {
    console.error("Error signing JWT", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
  return res.status(201).json({ message: "User registered successfully" });
});
module.exports = router;