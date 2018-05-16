var express = require('express');
var app = express();
var Plasso = require('./index.js');

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
