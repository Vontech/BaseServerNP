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
//      crypto - for random hash generation
//      base64-url - for encoding emails

const c         = require('./config');
const mailer    = require('./mailer');
const promise   = require('bluebird');
const bcrypt    = require('bcrypt');
const crypto    = require('crypto');
const base64url = require('base64-url');

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
            res.status(200)
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
                res.status(200)
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

// Forgot password functionality --------------------------------------------

// Returns json with an "exists" field for the given email, true if the user
// exists
function checkEmailForResetPassword(req, res, next) {
    
    if (!req.body.email) {
        res.status(500)
        .json({
            status: 'failure',
            message: 'No email given for request'
        });
        return;
    }
    
    c.db.any("SELECT * FROM users WHERE email=$1", [req.body.email])
        .then(function(data) {
            if (data.length > 0) {
                res.status(200)
                .json({
                    exists: true
                });
            } else {
                res.status(200)
                .json({
                    exists: false
                });
            }
        })
        .catch(function (err) {
            res.status(200)
            .json({
                exists: false
            });
            //return next(err);
        });
    
}

function sendForgotPasswordUrl(req, res, next) {
    
    var forgetUrl = "http://" + c.real_domain + "/rollout/forgot?id="
    
    // First, validate that an email was given
    if (!req.body.email) {
        res.status(500)
        .json({
            status: 'failure',
            message: 'No email given for request.'
        });
        return;
    }
    
    // Second, clear any previous requests for this given user (invalidates any previous request)
    c.db.none("DELETE FROM forgot_password_reqs WHERE email=$1", [req.body.email])
    .then(function() {
        
        // Create random hash
        var hash = crypto.randomBytes(20).toString('hex');
        
        // Store in DB the email, hash, and current time
        c.db.none('insert into forgot_password_reqs(email, u_hash)' +
                  'values($1, $2)', [req.body.email, hash])
        .then(function () {
            
            // Generate Base64 encoding of email:hash
            var encoding = base64url.encode(req.body.email + ":" + hash);
            console.log("Hash: " + encoding);
            
            // Send email with link to {{RolloutServerUrl}}/rollout/forgot?id=Base64(email:hash)
            var content = '<html><link href="https://fonts.googleapis.com/css?family=Lato" rel="stylesheet"> <style>body{padding: 16px;font-family: \'Lato\', sans-serif;max-width: 600px;}a{text-decoration: none;color: white;background: #2C2C2C;padding: 8px;border-radius: 4px;}</style><body><p>You have requested to reset your password for <b>Rollout</b>. Please follow the link below to finish resetting your password.</p><a href="' + forgetUrl + encoding + '">Reset Password</a></body></html>';
            
            mailer.sendEmail(req.body.email, "Rollout Password Reset", content, function(success) {
                
                if (success) {
                    res.status(200)
                    .json({
                        status: 'success',
                        message: 'Check your email for a link to reset your Rollout password.'
                    });
                } else {
                    res.status(500)
                    .json({
                        status: 'failure',
                        message: 'An error occured while attempting to reset your password; please try again.'
                    });
                }
                
            });
            
        })
        .catch(function (err) {
            console.log(err)
            res.status(500)
            .json({
                status: 'failure',
                error: err.message,
                message: 'An error occured while attempting to reset your password; please try again.'
            });
            //return next(err);
        });
    })
    .catch(function (err) {
        res.status(500)
        .json({
            status: 'failure',
            message: 'An error occured while attempting to reset your password; please try again.',
            error: err.message
        });
    });
    
}

function receiveForgotPasswordUrl(req, res, next) {
    
    // Validate request with fields 'request' and 'new_password'
    
    // Decode 'request' into email:hash
    
    // Get reset request from email                     - if fail, say time may have ran out
    
    // Check that hash matches, and that time is left   - if fail, say time may have ran out
    
    // If all good, bcrypt hash password and update users
    
    // Finally, delete row in forgot requests
    
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
    generateDB: generateDB,
    sendForgotPasswordUrl: sendForgotPasswordUrl,
    receiveForgotPasswordUrl: receiveForgotPasswordUrl
};