/**
 * This file contains constants and other information for setting up
 * and configuring the Rollout service, such as website URLs, database
 * locations, etc...
 *
 *      Written by Aaron Vontell, 2017
 */

// Port for website hosting
const webPort = process.env.PORT || 3000;

// Connection to the database
const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/rollout';

// Database configuration options
const dbOptions = {
    // Initialization Options
//    promiseLib: promise
};

// Mailer options
const real_domain = "rolloutserver.herokuapp.com";

// Database connection string. Modify the host, user, and password to connect to
// a remote PostgreSQL instance. Optionally use SSL to encrypt your connection.
var pgp = require('pg-promise')(dbOptions);
const db = pgp(connectionString);

// Client id and client secret for OAuth 2.0
// NOTE: The client secret should be kepy secret! Preferably set this variable
// as an environment variable; for now, this is public for debugging purposes.
// NOTE: If these are changed, then you will also need to update the
// AuthService within the AngularJS frontend, within /public/js/app.js (to
// include the new Base64 encoding of these objects -> id:secret)
// Happens to be: cm9sbG91dDpKQlVZOVZFNjkyNDNCWUM5MDI0Mzg3SEdWWTNBUUZL
const client_id = "rollout";
const client_secret = "JBUY9VE69243BYC9024387HGVY3AQFK";

module.exports = {
    webPort: webPort,
    db: db,
    client_id: client_id,
    client_secret: client_secret,
    real_domain: real_domain
};