// All helper methods for running our OAuth 2.0 server. Mostly taken by
// example from https://github.com/oauthjs/express-oauth-server/blob
// /master/examples/postgresql/model.js
//
// Written by Aaron Vontell
// Version 0.0.1 (July 26, 2017)

// MODULE DEPS ----------------------------------------------------------------
// Incorporate all of our modules needed to run this thing
//      ./config - ports, naming, urls, logos, etc... Found in config.js
//      ./db - module for reading and writing to/from the postgres database

const c       = require('./config')
const db      = require('./db')

// Returns information about the given access token
module.exports.getAccessToken = function(bearerToken, callback) {
    c.db.query('SELECT access_token, access_token_expires_on, client_id, user_id FROM oauth_tokens WHERE access_token = $1', [bearerToken])
    .then(function(result) {
        if(result.length > 0) {
            var token = result[0];
            callback(null, {
                accessToken: token.access_token,
                clientId: token.client_id,
                expires: token.access_token_expires_on,
                userId: token.user_id
            });
        } else {
            return callback(false, null);
        }
    });
};

// Checks the types of grants allowed for the given client
module.exports.grantTypeAllowed = function(clientId, grantType, callback) {
    if ((grantType === 'password' || grantType === 'client_credentials' && clientId !== c.client_id)) {
        //console.log('Accepted ' + grantType + ' grant request from client ' + clientId);
        console.log("Grant type accepted");
        callback(false, true);
    }
    else {
        //console.log('Rejected ' + grantType + ' grant request from client ' + clientId);
        callback(false, false);
    }
}

// Checks the validity of the given client id and secret
// Note that for our purposes, the only client with access to the OAuth
// server is the website and apps, so this won't matter too much
module.exports.getClient = function (clientId, clientSecret, callback) {
    // If this is the expected client id and secret, then proceed
    if(clientId == c.client_id && clientSecret == c.client_secret) {
        callback(null, {
            clientId: c.client_id,
            clientSecret: c.client_secret
        });
    } else {
        // Otherwise, search for the appropriate client
        c.db.query('SELECT client_id, client_secret, redirect_uri FROM oauth_clients WHERE client_id = $1 AND client_secret = $2', [clientId, clientSecret])
        .then(function(result) {
            var oAuthClient = result.rows[0];

            if (!oAuthClient) {
                callback({error: "No client with this id or secret found"}, null);
            }

            callback(null, {
                clientId: oAuthClient.client_id,
                clientSecret: oAuthClient.client_secret,
                redirectUri: oAuthClient.redirect_uri
            });
        });
    }
    
};


// Get a user, who we will then provide with an access token
module.exports.getUser = function (email, password, callback) {
    c.db.one('SELECT id FROM users WHERE email = $1', [email])
    .then(function(result) {
        
        // Check if the user exists
        if (result.id > 0) {
          
            // Validate the user
            var valid = db.validateUser(email, password, function(valid) {
                if(valid) {
                    callback(null, result);
                } else {
                    callback({error: "User credentials are incorrect"}, null);
                }    
            });
          
        } else {
            callback({error: "User credentials are incorrect"}, null);
        }
        
    }, function(error) {
        callback({error: "User credentials are incorrect"}, null);
    });
};

// Save the generate access token
module.exports.saveAccessToken = function (token, client, expires, user, callback) {
    
    // Only input the access token if one does not already exist and the expiration
    // has not passed. Otherwise, do an update
    c.db.query('SELECT access_token, access_token_expires_on, user_id FROM oauth_tokens WHERE user_id = $1', [user.id])
    .then(function(result) {
        query = 'INSERT INTO oauth_tokens(access_token, access_token_expires_on, client_id, user_id) VALUES ($1, $2, $3, $4)'
        if(result.length > 0) {
            // If exists, then simply update the expiration
            console.log("Old token was found for this user");
            query = 'UPDATE oauth_tokens SET access_token=$1, access_token_expires_on=$2, client_id=$3 WHERE user_id=$4'
        }
        
        // Otherwise, save the new token
        c.db.query(query, [
            token,
            expires,
            client,
            user.id
        ]).then(function(result) {
            console.log("New access token saved: " + token);
            callback(result.rowCount ? result.rows[0] : false);
        });
        
    });
    
};