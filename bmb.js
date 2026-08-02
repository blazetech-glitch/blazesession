const express = require('express');
const app = express();
const __path = process.cwd();
const bodyParser = require("body-parser");
const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || '0.0.0.0';
let server = require('./qr'),
    code = require('./pair');
require('events').EventEmitter.defaultMaxListeners = 500;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/server', server);
app.use('/code', code);
app.use('/pair', async (req, res, next) => {
    res.sendFile(__path + '/pair.html')
})
app.use('/qr', async (req, res, next) => {
    res.sendFile(__path + '/qr.html')
})
app.use('/', async (req, res, next) => {
    res.sendFile(__path + '/main.html')
})

app.listen(PORT, HOST, () => {
    console.log(`
Don't Forget To Give Star ARNOLDT20/Viper2

 Server running on http://${HOST}:${PORT}`)
})

module.exports = app
