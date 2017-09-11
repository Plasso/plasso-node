var express = require('express');
var app = express();
var Billing = require('./index.js').billing;

var billing = new Billing();

app.use('/protected', billing.getMiddleware());
app.use('/protected', (req, res) => {
  res.end('super secret site');
});
app.use((req, res) => {
	var html = `
<a href="https://plasso.com/s/abc123" class="plo-button">Sign Up</a>
<a href="https://plasso.com/s/abc123/login" class="plo-button">Login</a>
<script src='https://plasso.co/embed/v3/e.js'></script>
`;
  res.end(html);

});

app.listen(3131);
