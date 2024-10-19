const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(__dirname + '/dist/tradingview-angular-app'));

app.get('/*', function (req, res) {
    res.sendFile(path.join(__dirname + '/dist/tradingview-angular-app/index.html'));
});

app.listen(8080, '0.0.0.0', function () {
    console.log('Listening on port 8080!');
});
