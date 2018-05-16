const https = require('https');
const url = require('url');

function parseCookies(req) {
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
    res.cookie('_plasso_flexkit', value, { path, expires: expdate });
  } else {
    let cookies = res.getHeader('Set-Cookie');
    if (typeof cookies != 'object') {
      cookies = [];
    }
    cookies.push(`_plasso_flexkit=${value};expires=${expdate.toUTCString()};path=${path}`);
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
  this.token = options ? options.token : undefined;
}

Plasso.prototype.memberData = null;

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
  if (cookies._plasso_flexkit != null) {
    this.deserialize(decodeURIComponent(cookies._plasso_flexkit));
  }
}

Plasso.prototype.saveToResponse = function(res) {
  setCookie(res, this.serialize(), 1, '/');
}

Plasso.prototype.generateMemberUrlQuery = function(token) {
  const query = `{
      member(token: "${token}") {
        name,
        email,
        billingInfo {
          street,
          city,
          state,
          zip,
          country
        },
        connectedAccounts {
          id,
          name
        },
        dataFields {
          id,
          value
        },
        id,
        metadata,
        payments {
          id,
          amount,
          createdAt,
          createdAtReadable
        },
        postNotifications,
        shippingInfo {
          name,
          address,
          city,
          state,
          zip,
          country
        },
        sources {
          createdAt,
          id,
          brand,
          last4,
          type
        },
        space {
          id,
          name,
          logoutUrl
        },
        status,
        subscriptions {
          id,
          status,
          createdAt,
          createdAtReadable,
          plan {
            id,
            name
          }
        }
      }
    }`;
  return encodeURIComponent(query);
}

Plasso.prototype.authenticate = function(options, cb) {
  if (options == null || !options.token) {
    return cb(new Error('token required'));
  }

  const query = this.generateMemberUrlQuery(options.token);
  const apiUrl = `https://api.plasso.com/?query=${query}`;

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

        this.member = parsedData.data.member;
        this.space = parsedData.data.member.space;

        Plasso.prototype.memberData = parsedData.data;

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

Plasso.prototype.middleware = function() {
  var that = this;
  return function (req, res, next) {
    const parsedUrl = url.parse(req.url, true);
    let logoutUrl = `//${req.headers.host}`;
    const plasso = new Plasso({ token: that.token });

    req.plasso = plasso;

    plasso.loadFromRequest(req);

    if (parsedUrl.query._plasso_token) {
      plasso.token = parsedUrl.query._plasso_token;
    }

    if (parsedUrl.query._logout != null || parsedUrl.query._plasso_token == 'logout') {
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
