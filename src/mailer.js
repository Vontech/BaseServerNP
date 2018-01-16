/**
 * This file contains methods for sending email using Mailgun
 *
 *      Written by Aaron Vontell, 2017
 */

// MODULE DEPS ----------------------------------------------------------------
// Incorporate all of our modules needed to run this thing
//      ./config    - ports, naming, urls, logos, etc... Found in config.js
//      nodemailer  - node module for making the email requests
//      mg          - node module for making the email requests

const c           = require('./config')
const nodemailer  = require('nodemailer');
const mg          = require('nodemailer-mailgun-transport');

// Callback takes boolean indicating 'sent'
function sendEmail(email, subject, htmlMessage, callback) {
    
    try {

        var auth = {
          auth: {
            api_key: process.env.MAIL_KEY || 0,
            domain: process.env.MAIL_DOMAIN || 0
          }
        }

        var transporter = nodemailer.createTransport(mg(auth));

        var mailOptions = {
            from: "noreply@" + c.real_domain,
            to: email,
            subject: subject,
            html: htmlMessage
        };

        transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
                console.log(error);
                callback(false);
            } else {
                callback(true);
            }
        });
        
    } catch (err) {
        console.log(err);
        callback(false);
    }
    
}

module.exports = {
    sendEmail: sendEmail
}