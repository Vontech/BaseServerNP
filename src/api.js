/**
 * This file contains methods for queries and information through endpoints.
 *
 *      Written by Aaron Vontell, 2017
 */

// MODULE DEPS ----------------------------------------------------------------
// Incorporate all of our modules needed to run this thing
//      ./config - ports, naming, urls, logos, etc... Found in config.js
//      express - the actual web framework
//      ./db - code to access the db using pg-promise

const c       = require('./config')
const express = require('express')
const db      = require('./db');

var router = express.Router();

// User Routes
router.post('/users', db.createUser);
router.get('/generate', db.generateDB);
           
module.exports = router;