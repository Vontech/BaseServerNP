/**
 * Welcome to the entry point of the Rollout website!
 *
 *      Written by Aaron Vontell, Param Bidja, and Tej Patel during December 2017 - January 2018
 */

// MODULE DEPS ----------------------------------------------------------------
// Incorporate all of our modules needed to run this thing
//      ./src/config - ports, naming, urls, logos, etc... Found in config.js
//      express - the actual web framework
//      ./api - endpoints for data manipulation
//      body-parser - used for body parsing...
//      ./apis - endpoints for secured data manipulation
//      oauth2-server - the library for oauth2-based authentication

const c           = require('./src/config');
const express     = require('express');
const api         = require('./src/api');
const bodyParser  = require('body-parser');
const apis        = require('./src/apis')
const oauthServer = require('oauth2-server');

const app = express()

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

// serve the html content
app.use(express.static('public'));

// AUTH HANDLING --------------------------------------------------------------

// Add OAuth server.
app.oauth = oauthServer({
    model: require('./src/auth'),
    grants: ['password'],
    debug: true // TODO: Upon production, make this false?
});

// Post token.
app.post('/oauth/token', app.oauth.grant());

// Get secret.
app.get('/oauth/validate', app.oauth.authorise(), function(req, res) {
  // Will require a valid access_token.
  res.send({authorized: true});
});

// BASIC ROUTING --------------------------------------------------------------

// Use the api!
app.use("/api", api);

// The endpoints in "apis" requires authentication
app.use("/apis", app.oauth.authorise(), apis);

// Some error handling
app.use(app.oauth.errorHandler());
app.use(function(err, req, res, next) {
    var message = {
        status: 'error',
        message: err
    };
    console.log(JSON.stringify(message));
    res.status( err.code || 500 )
    .json(message);
});

// WEB SERVER STARTUP ---------------------------------------------------------

app.listen(c.webPort, function () {
    
    console.log("Now hosting Rollout on port " + c.webPort);
    
});
