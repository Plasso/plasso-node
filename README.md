# Billing Example

To install the plasso library using NPM do: `npm install --save plasso`.

An example of using express:

```javascript
var express = require('express');
var app = express();
var Billing = require('plasso').billing;

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
```

If this site is running at `myurl.com:3131` you can set the forward url in your plasso account to `myurl.com:3131/protected`.  If the user is not logged in they will be redirected to the root url `myurl.com:3131/`.  If they are logged in then they log out the go to your configured Logout Url.
