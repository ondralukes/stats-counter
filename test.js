const express = require('express');

const statsCounter = require('./stats-counter');

const app = express();

app.use(statsCounter({
    visitTime: 10,
    apiPath: '/stats'
}));

app.get('/', (req, res) => {
    res.end('test');
});

app.listen(8080);