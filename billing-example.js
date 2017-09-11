var express = require('express');
var app = express();
var Billing = require('./index.js').billing;

var billing = new Billing();

app.use('/protected', billing.getMiddleware());
app.use('/protected', (req, res) => {
  res.end('super secret site');
});
app.use((req, res) => {
  res.end('public');
});

app.listen(3131);
