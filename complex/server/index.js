const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Client Setup
const { Pool } = require('pg');
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort
});
pgClient.on('error', () => console.log('Lost PG connection'));

// pgClient
//   .query('CREATE TABLE IF NOT EXISTS values (number INT)')
//   .catch(err => console.log(err));
// above code seem to fail because docker-compose does not wait for postgres to fully start up
// code below is a workaround to this so that express keeps retrying to create table until postgres is ready

const RETRY_INTERVAL = 2000
const MAX_RETRY = 10

function createTable(iterateCount = 1) {
    if (iterateCount > MAX_RETRY) {
        console.log(`Failed to create table after repeated attempts`);
        console.log(`Make sure all configurations are correct`);
        return;
    }

    pgClient
        .query('CREATE TABLE IF NOT EXISTS values (number INT)')
        .then(() => {
            console.log('Table created!');
        })
        .catch(err => {
            console.log(err);
            console.log('Failed to create table');
            console.log(`Retrying in ${RETRY_INTERVAL}ms`);
            setTimeout(() => createTable(iterateCount + 1), RETRY_INTERVAL);
        });
}

createTable();

// Redis Client Setup
const redis = require('redis');
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
});
const redisPublisher = redisClient.duplicate();

// Express route handlers

app.get('/', (req, res) => {
  res.send('Hi');
});

app.get('/values/all', async (req, res) => {
  const values = await pgClient.query('SELECT * from values');

  res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
  redisClient.hgetall('values', (err, values) => {
    res.send(values);
  });
});

app.post('/values', async (req, res) => {
  const index = req.body.index;

  if (parseInt(index) > 40) {
    return res.status(422).send('Index too high');
  }

  redisClient.hset('values', index, 'Nothing yet!');
  redisPublisher.publish('insert', index);
  pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

  res.send({ working: true });
});

app.listen(5000, err => {
  console.log('Listening');
});
