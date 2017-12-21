/**
 * This file contains methods for secured queries and information through 
 * endpoints.
 *
 *      Written by Aaron Vontell, 2017
 */

// MODULE DEPS ----------------------------------------------------------------
// Incorporate all of our modules needed to run this thing
//      ./config - ports, naming, urls, logos, etc... Found in config.js
//      express - the actual web framework
//      ./db - code to access the db using pg-promise

const c       = require('./config');
const express = require('express');
const db      = require('./db');

var router = express.Router();

// User routes
router.get('/users', db.getThisUser);
router.patch('/users', db.updateThisUser);

// Auth routes
router.delete('/users/token', db.revokeAccess);

// Admin routes
router.get('/admin/logs', db.getLogs);
router.get('/admin/users', db.getUsers);
router.get('/admin/admins', db.getAdminUsers);
router.post('/admin/addadmin', db.makeAdminUser);
router.post('/admin/revokeadmin', db.revokeAdminUser);
           
module.exports = router;
