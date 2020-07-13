const express = require('express');

const statsCounter = require('./stats-counter');

const app = express();

app.use(statsCounter({
    visitTime: 300,
    apiPath: '/stats',
    savePath: 'statsSave',
    saveInterval: 5,
    debugLog: true
}));

app.get('/', (req, res) => {
    res.end('test');
});

app.listen(8080);