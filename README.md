# RolloutServer

This NodeJS server is the main server for the Rollout application / platform.

## Setup Instructions (Linux / macOS)

1. Install Postgres ([here](https://www.postgresql.org/download/))
2. Install a Postgres DB viewer (for macOS, I recommend Postico, found [here](https://eggerapps.at/postico/))
3. Install npm ([here](https://www.npmjs.com/get-npm))
4. Install Postman ([here](https://www.getpostman.com/))
5. Add the Postman Collection to your Postman client. You can do this manually with the "Import" option in Postman, and using the postman collection file location within this project's root folder. Alternatively, ask me (vontell@mit.edu) to share it with you by adding you to the Postman team.
6. Add the Postman environment variables file to your Postman Client. These are secret and sensitive, so please get the file from me. Click the settings/gear icon at top right of Postman, manage environments, and then click import. After importing, make sure the dropdown menu shows this environment.
4. Download / clone this repository
5. Create a database through the Postgres terminal with command `CREATE DATABASE rollout;` (usually you can start the terminal with the `psql` command)
6. Run the server setup script with `sh rollout`. This will connect to the Postgres instance, create the database, and start the server. For any subsequent server startups, use the command `nodemon app.js`.
7. Test that your setup was done successfully by running the "Create User" call and then the "Authenticate" call. You should get responses saying that a user was successfully created, and then that you got an access token (which is saved automatically in Postman for later use!) You can also use Postico / a Postgres viewer to view the tables (db name should be `rollout`).
8. Start developing!

## Deploying and running on Heroku

Coming soon!