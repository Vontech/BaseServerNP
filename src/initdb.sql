--
-- This file essentially contains all of the Schemas for our database
--

DROP DATABASE IF EXISTS rollout;
CREATE DATABASE rollout;

\c rollout;

CREATE TABLE log (
  id SERIAL PRIMARY KEY,
  action VARCHAR,
  type VARCHAR,
  message VARCHAR default NULL,
  time TIMESTAMP
);

--
-- Data and schemas for authentication
--

CREATE TABLE users (
  id SERIAL,
  email VARCHAR PRIMARY KEY NOT NULL,
  name VARCHAR NOT NULL,
  active BOOLEAN default true,
  created TIMESTAMP without time zone default current_timestamp,
  password VARCHAR,
  admin BOOLEAN default false,
  phone VARCHAR,
  last_location DECIMAL ARRAY[4],
  last_updated TIMESTAMP
);

--
-- Name: oauth_tokens; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE oauth_tokens (
    id SERIAL NOT NULL,
    access_token text NOT NULL,
    access_token_expires_on timestamp without time zone NOT NULL,
    client_id text NOT NULL,
    user_id integer UNIQUE NOT NULL
);


--
-- Name: oauth_clients; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE oauth_clients (
    client_id text NOT NULL,
    client_secret text NOT NULL,
    redirect_uri text NOT NULL
);

--
-- Forgot Password tracking table
--

CREATE TABLE forgot_password_reqs (
    id SERIAL NOT NULL,
    email VARCHAR PRIMARY KEY REFERENCES users,
    u_hash VARCHAR NOT NULL,
    time_requested timestamp without time zone default current_timestamp
);


--
-- Name: oauth_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY oauth_tokens
    ADD CONSTRAINT oauth_tokens_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (client_id, client_secret);
    