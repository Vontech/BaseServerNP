/**
 * This file contains methods for manipulating and logging data
 * on the database.
 *
 *      Written by Aaron Vontell, 2017
 */

// MODULE DEPS ----------------------------------------------------------------
// Incorporate all of our modules needed to run this thing
//      ./config - ports, naming, urls, logos, etc... Found in config.js
//      bluebird - a promises library for PostgreSQL
//      bcrypt - hashing and salting for user creation

const c       = require('./config');
const promise = require('bluebird');
const bcrypt  = require('bcrypt');

// Logs an action on the database, for auditing purposes
function log(action, type, message) {
    console.log(message)
    c.db.none('insert into log(action, type, message, time)' +
            'values($1, $2, $3, clock_timestamp())', [action, type, message]);
}

// User functionality ---------------------------------------------------------

// A string of relevant user properties to grab when obtaining user information
const relevantUserProps = 'id, email, name, active, created, admin, phone, last_location, last_updated';

function getUser(userId, callback) {
    c.db.one('select ' + relevantUserProps + ' from users where id=$1', [userId])
        .then(function (data) {
            callback(data);
    })
    .catch(function (err) {
            callback(err);
    });
}

function _getUsersByEmail(email, callback) {
    c.db.any('select ' + relevantUserProps + ' from users where email=$1', [email])
        .then(function (data) {
            callback(data);
    })
    .catch(function (err) {
            callback(err);
    });
}

// Calls callback with the found user if the user is an admin. Otherwise, a 403 error is thrown
function getUserIfAdmin(userId, res, callback) {
    c.db.one('select ' + relevantUserProps + ' from users where id=$1', [userId])
        .then(function (data) {
            if (data.admin) {
                callback(data);
            } else {
                res.status(403)
                .json({
                    message: "User does not have admin access"
                })
            }
            
        })
        .catch(function (err) {
            res.status(404)
            .json({
                message: "User with given userId not found"
            })
    });
}

// Creates a new user from the given information
function createUser(req, res, next) {
    
    // First make sure that email is provided for an initial check
    if(!req.body.email) {
        res.status(500)
        .json({
            status: 'failure',
            message: 'Failure to create account; an email must be provided.'
        });
        return;
    }
    
    // TODO: Check if a user already exists
    _getUsersByEmail(req.body.email, function(results) {
        
        // If the results show that a user already exists, return an error
        if (results.length > 0) {
            res.status(500)
            .json({
                status: 'failure',
                message: 'An account with this email already exists; please try another email.'
            });
            return;
        }
        
        bcrypt.hash(req.body.password, 8, function(err, hash) {
        
            req.body.password = hash;
            c.db.none('insert into users(email, name, password, phone)' +
            'values(${email}, ${name}, ${password}, ${phone})',
            req.body)
            .then(function () {
                res.status(200)
                .json({
                    status: 'success',
                    message: 'Inserted new user ' + req.body.email
                });
            })
            .catch(function (err) {
                console.log(err)
                res.status(500)
                .json({
                    status: 'failure',
                    error: err.message,
                    message: 'Sorry, there was an issue with creating your account; please try again later.'
                });
                //return next(err);
            });

        });
        
    });

}

// Returns true if this is a valid username and password; false otherwise
function validateUser(email, password, cb) {
    console.log("validating user")
    c.db.one("select password from users where email = '" + email + "'")
        .then(function (data) {
            cb(bcrypt.compareSync(password, data.password));
        })
    .catch(function (err) {
        console.log(JSON.stringify(err));
        cb(false);
    });
}

// Revokes a user's access token
function revokeAccess(req, res, next) {
    
    c.db.none("delete from oauth_tokens where user_id=$1", [req.user.id])
    .then(function (data) {
        res.status(200)
        .json({
            status: "success",
            message: "Successfully logged out."
        });
    })
    .catch(function (err) {
        return next(err);
    });
    
}

// Retrieves a user entry for a specific user
function getThisUser(req, res, next) {
    
    getUser(req.user.id, function(user) {
        c.db.one('select ' + relevantUserProps + ' from users where email=${email}',
                user)
            .then(function (data) {
                res.status(200)
                    .json({
                        status: "success",
                        data: data
                    });
            })
            .catch(function (err) {
                console.log(err);
                res.status(500)
                    .json({
                        status: "Error",
                        data: err
                    });
            });
    });
    
}

// Updated a user entry for a specific user
function updateThisUser(req, res, next) {
    
    getUser(req.user.id, function(user) {
        
        // Validate before making the query
        // TODO: We should allow them to change their email, but we have to first check if that email is taken
        if ("id" in req.body || "password" in req.body || "created" in req.body || "admin" in req.body || "email" in req.body) {
            res.status(500)
            .json({
                status: 'failure',
                message: 'id, password, admin, email, or created cannot be updated.'
            });
        } else {
            
            var query = updateQuery("users", "email", user.email, req.body);
            c.db.none(query, req.body)
            .then(function(data) {
                getThisUser(req, res, next);
            })
            .catch(function (err) {
                res.status(500)
                .json({
                    status: 'failure',
                    message: 'invalid parameter for user update'
                });
                //return next(err);
            });
            
        }
    });
    
}

// Admin functionality ------------------------------------------------------

// Returns all logs from the server - must be an admin and authenticated to access this resource
function getLogs(req, res, next) {
    
    getUserIfAdmin(req.user.id, res, function(user) {
        c.db.any("select * from log order by time")
            .then(function (data) {
                res.status(200)
                    .json({
                        status: "success",
                        data: data
                    });
            })
            .catch(function (err) {
                res.status(500)
                .json({
                    status: 'failure',
                    message: 'Error getting logs from server'
                });
            });
    });
    
}

// Returns a list of all users and their information - must be an admin and authenticated to access this resource
function getUsers(req, res, next) {
    getUserIfAdmin(req.user.id, res, function(user) {
        c.db.any("select " + relevantUserProps + " from users")
            .then(function (data) {
                res.status(200)
                    .json({
                        status: "success",
                        data: data
                    });
            })
            .catch(function (err) {
                res.status(500)
                .json({
                    status: 'failure',
                    message: 'Error getting users from server'
                });
            });
    });
}

// Returns a list of all users which are admins - must be an admin and authenticated to access this resource
function getAdminUsers(req, res, next) {
    getUserIfAdmin(req.user.id, res, function(user) {
        c.db.any("select " + relevantUserProps + " from users where admin = true")
            .then(function (data) {
                res.status(200)
                    .json({
                        status: "success",
                        data: data
                    });
            })
            .catch(function (err) {
                res.status(500)
                .json({
                    status: 'failure',
                    message: 'Error getting admin users from server'
                });
            });
    });
}

function makeAdminUser(req, res, next) {
    changeAdminStatus(true, req, res, next);
}

function revokeAdminUser(req, res, next) {
    changeAdminStatus(false, req, res, next);
}

function changeAdminStatus(admin, req, res, next) {
    getUserIfAdmin(req.user.id, res, function(user) {
        
        var userToUpdate = req.body.email;
        var query = updateQuery("users", "email", userToUpdate, {admin: admin});
            c.db.none(query, {admin: admin})
            .then(function(data) {
                if (admin) {
                    log("ADMIN", "ADD", req.body.username + " now has administrator access, completed by " + user.email);
                } else {
                    log("ADMIN", "REVOKE", req.body.username + " no longer has administrator access, completed by " + user.email);
                }
                
                res.status(200)
                .json({
                    status: 'success',
                    message: userToUpdate + ' admin status has changed to ' + admin
                });
            })
            .catch(function (err) {
                res.status(500)
                .json({
                    status: 'failure',
                    message: 'An error occured while changing this users admin status',
                    err: query
                });
                //return next(err);
            });
        
    });
}

function generateDB(req, res, next) {
    
    c.db.none("CREATE TABLE log( id SERIAL PRIMARY KEY, action VARCHAR, type VARCHAR, message VARCHAR default NULL, time TIMESTAMP); CREATE TABLE users ( id SERIAL, email VARCHAR PRIMARY KEY NOT NULL, name VARCHAR NOT NULL, active BOOLEAN default true, created TIMESTAMP without time zone default current_timestamp, password VARCHAR, admin BOOLEAN default false, phone VARCHAR, last_location DECIMAL ARRAY[4], last_updated TIMESTAMP ); CREATE TABLE oauth_tokens ( id SERIAL NOT NULL, access_token text NOT NULL, access_token_expires_on timestamp without time zone NOT NULL, client_id text NOT NULL, user_id integer UNIQUE NOT NULL ); CREATE TABLE oauth_clients ( client_id text NOT NULL, client_secret text NOT NULL, redirect_uri text NOT NULL ); ALTER TABLE ONLY oauth_tokens ADD CONSTRAINT oauth_tokens_pkey PRIMARY KEY (id); ALTER TABLE ONLY oauth_clients ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (client_id, client_secret);")
        .then(function() {
            res.status(200)
            .json({
                status: 'success'
            });
        })
        .catch(function (err) {
            res.status(500)
            .json({
                status: 'failure',
                err: err
            });
        });
    
}

// Helper functions
var escapeRegExp = function(strToEscape) {
    // Escape special characters for use in a regular expression
    return strToEscape.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
};

var trimChar = function(origString, charToTrim) {
    charToTrim = escapeRegExp(charToTrim);
    var regEx = new RegExp("^[" + charToTrim + "]+|[" + charToTrim + "]+$", "g");
    return origString.replace(regEx, "");
};

function updateQuery (table, where, id, cols) {
    // Setup static beginning of query
    var query = ['UPDATE ' + table];
    query.push('SET');

    // Create another array storing each set command
    // and assigning a number value for parameterized query
    var set = [];
    Object.keys(cols).forEach(function (key, i) {
        set.push(key + ' = ${' + key + '}'); 
    });
    query.push(set.join(', '));

    // Add the WHERE statement to look up by id
    query.push('WHERE ' + where + ' = \'' + id + "\'");

    // Return a complete query string
    return query.join(' ');
}

module.exports = {
    log: log,
    validateUser: validateUser,
    createUser: createUser,
    getUser: getUser,
    updateThisUser: updateThisUser,
    getThisUser: getThisUser,
    revokeAccess: revokeAccess,
    getLogs: getLogs,
    getUsers: getUsers,
    getAdminUsers: getAdminUsers,
    makeAdminUser: makeAdminUser,
    revokeAdminUser: revokeAdminUser,
    generateDB: generateDB
};