# Flexkit Example

To install the plasso library using NPM do: `npm install --save plasso`.

An example of using express:

```javascript
var express = require('express');
var app = express();
var Plasso = require('plasso');

var plasso = new Plasso();

app.use('/protected', plasso.middleware());
app.use('/protected', (req, res) => {
  res.end('super secret site');
});
app.use((req, res) => {
  var html = `
<a href="https://plasso.com/s/abc123">Sign Up</a>
<a href="https://plasso.com/s/abc123/login">Login</a>
<script src='https://plasso.com/embed/storefront.1.0.js'></script>
<script>
  Plasso.cart.setup({
    spaceId: 'abc123',
    mode: 'signup'
  });
</script>
`;
  res.end(html);
});

app.listen(3131);
```
If this site is running at `myurl.com:3131` you can set the forward url in your plasso account to `myurl.com:3131/protected`.  If the user is not logged in they will be redirected to the root url `myurl.com:3131/`.  If they are logged in then they log out the go to your configured Logout Url.

## Member Data
After a member is successfully authenticated all of their Member Data will be available in `plasso.memberData`.

```javascript
app.use('/protected', (req, res) => {
  var data = plasso.memberData;
  res.end('super secret site. <hr>' + JSON.stringify(data));
});
```
