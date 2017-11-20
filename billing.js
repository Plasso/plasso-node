const https = require('https');
const url = require('url');

function parseCookies (req) {
  const list = {};
  const rc = req.headers.cookie;

  rc && rc.split(';').forEach(function( cookie ) {
    const parts = cookie.split('=');
    list[parts[0].trim()] = decodeURI(parts.slice(1).join('='));
  });

  return list;
}

function setCookie(res, value, days, path) {
  const expdate = new Date();
  expdate.setDate(expdate.getDate() + days);
  if (res.cookie) {
    res.cookie('__plasso_billing', value, { path, expires: expdate });
  } else {
    let cookies = res.getHeader('Set-Cookie');
    if (typeof cookies != 'object') {
      cookies = [];
    }
    cookies.push(`__plasso_billing=${value};expires=${expdate.toUTCString()};path=${path}`);
    res.setHeader('Set-Cookie', cookies);
  } 
}

function clearCookie(res, path) {
  setCookie(res, '{}', -2, path);
}

function redirect(res, location) {
  res.writeHead(302, { 'Location': location });
  res.end();
}

function Plasso(options) {
  this.publicKey = options ? options.publicKey : undefined;
}

Plasso.prototype.deserialize = function(data) {
  const props = JSON.parse(data);
  this.member = props.member;
  this.space = props.space;
  this.token = props.token;
}

Plasso.prototype.serialize = function() {
  return JSON.stringify({ member: this.member, space: this.space, token: this.token });
}

Plasso.prototype.loadFromRequest = function(req) {
  const cookies = parseCookies(req);
  if (cookies.__plasso_billing != null) {
    this.deserialize(decodeURIComponent(cookies.__plasso_billing));
  }
}

Plasso.prototype.saveToResponse = function(res) {
  setCookie(res, this.serialize(), 1, '/');
}

Plasso.prototype.authenticate = function(options, cb) {
  if (options == null || !options.token) {
    return cb(new Error('token required'));
  }

  // TODO: get slug and planId and publicKey
  const apiUrl = `https://api.plasso.com/?query=%7Bmember(token%3A%22${options.token}%22)%7Bid%2Cspace%7BlogoutUrl%7D%7D%7D`;

  https.get(apiUrl, function (apiResponse) {
    if (apiResponse.statusCode !== 200) {
      let rawData = '';
      apiResponse.on('data', (chunk) => rawData += chunk);
      apiResponse.on('end', () => { cb(new Error(rawData)); });
      return;
    }
    apiResponse.setEncoding('utf8');
    let rawData = '';
    apiResponse.on('data', (chunk) => rawData += chunk);
    apiResponse.on('end', () => {
      try {
        let parsedData = JSON.parse(rawData);
        if (parsedData.errors && parsedData.errors.length > 0) {
          return cb(new Error(JSON.stringify(parsedData.errors)));  
        }
        
        this.member = {
          id: parsedData.data.member.id,
          planId: parsedData.data.member.planId,
        };

        this.space = {
          logoutUrl: parsedData.data.member.space.logoutUrl,
        }

        cb(null);
      } catch (e) {
        cb(e);
      }
    });
  }).on('error', cb);
}

Plasso.prototype.isAuthenticated = function(options, cb) {
  if (!this.member) {
    cb(false);
  }
  cb(true);
}

Plasso.prototype.updateMember = function(options, cb) {
  cb(new Error('Not implemented'));
  // TODO: Call mutations to update member
}

Plasso.prototype.getMiddleware = function() {
  var that = this;
  return function (req, res, next) {
    const parsedUrl = url.parse(req.url, true);
    let logoutUrl = `//${req.headers.host}`;
    const plasso = new Plasso({ publicKey: that.publicKey });

    req.plasso = plasso;

    plasso.loadFromRequest(req);

    if (parsedUrl.query.__plasso_token) {
      plasso.token = parsedUrl.query.__plasso_token;
    }

    if (parsedUrl.query.__logout != null || parsedUrl.query.__plasso_token == 'logout') {
      clearCookie(res, '/');
      redirect(res, plasso.space ? plasso.space.logoutUrl : logoutUrl);
      return;
    }

    if (plasso.token == null) {
      clearCookie(res, '/');
      redirect(res, plasso.space ? plasso.space.logoutUrl : logoutUrl);
      return;
    }

    plasso.authenticate({ token: plasso.token }, function(err) {
      if (err) {
        clearCookie(res, '/');
        redirect(res, plasso.space ? plasso.space.logoutUrl : logoutUrl);
        return;
      }
      setCookie(res, JSON.stringify(plasso), 1, '/');
      next();
    });
  }
}

module.exports = Plasso;
