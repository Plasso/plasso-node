const http = require('http');

const GRAPHQL_GET_DATA = `
  query getMember($token: String) {
    member(token: $token) {
      id,
      name,
      email,
      ccType,
      ccLast4,
      shippingInfo {
        name
        address
        city
        state
        zip
        country
      },
      dataFields {
        id,
        value
      },
      plan {
        alias
      }
    }
  }
`;

function sendRequest(method, path, request, cb) {
  jsonRequest = JSON.stringify(request);

  const req = http.request({
    host: 'plasso.com',
    path: path,
    protocol: 'https:',
    port: 80,
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(jsonRequest)
    },
  },
  (res) => {
    var data = "";
    
    res.setEncoding('utf8');
    res.on('data', function(chunk) {
      data += chunk;
    });
    res.on('error', function(error) {
      cb(error);
    });
    res.on('end', function() {
      if (res.statusCode < 200 || res.statusCode > 299) {
        cb(new Error(JSON.parse(data).error));
      } else {
        cb(null, JSON.parse(data));
      }
    });
  });

  req.on('error', (e) => {
    cb(e);
  });

  if (jsonRequest) {
    req.write(jsonRequest);  
  }
  
  req.end();
}

function Member(publicKey, token) {
  this.publicKey = publicKey;
  this.token = token;
}

Member.prototype.updateSettings = function() {
  const that = this;
  return new Promise(function(resolve, reject) {
    request["public_key"] = that.public_key;
    request["token"] = that.token;
    sendRequest("PUT", "/api/services/user?action=settings", request, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

Member.prototype.updateCreditCard = function() {
  const that = this;
  return new Promise(function(resolve, reject) {
    request["public_key"] = that.public_key;
    request["token"] = that.token;
    sendRequest("PUT", "/api/services/user?action=cc", request, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

Member.prototype.delete = function() {
  const that = this;
  return new Promise(function(resolve, reject) {
    sendRequest("DELETE", "/api/service/user?action=cancel", {"public_key": that.public_key, "token": that.token}, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

Member.prototype.getData = function() {
  request = {
    "query": GRAPHQL_GET_DATA,
    "variables": {
      "token": this.token
    }
  };
  const that = this;
  return new Promise(function(resolve, reject) {
    request["public_key"] = that.public_key;
    request["token"] = that.token;
    sendRequest("POST", "/graphql", request, function(err, response) {
      if (err) {
        reject(err);
        return;
      }

      if (response['errors']) {
        throw new Error(response['errors'][0]['message']);
      }

      memberData = {
        "credit_card_last4": response['data']['member']['ccLast4'],
        "credit_card_type": response['data']['member']['ccType'],
        "email": response['data']['member']['email'],
        "id": response['data']['member']['id'],
        "name": response['data']['member']['name'],
        "plan": response['data']['member']['plan']['alias']
      }

      if (response['data']['member']['shippingInfo']) {
        memberData['shipping_name'] = response['data']['member']['shippingInfo']['name'];
        memberData['shipping_address'] = response['data']['member']['shippingInfo']['address'];
        memberData['shipping_city'] = response['data']['member']['shippingInfo']['city'];
        memberData['shipping_state'] = response['data']['member']['shippingInfo']['state'];
        memberData['shipping_zip'] = response['data']['member']['shippingInfo']['zip'];
        memberData['shipping_country'] = response['data']['member']['shippingInfo']['country'];
      }

      if (response['data']['member']['dataFields']) {
        memberData['data_fields'] = response['data']['member']['dataFields'];
      }

      resolve(memberData);
    });
  });
}

Member.prototype.update_credit_card = function() {
  const that = this;
  return new Promise(function(resolve, reject) {
    sendRequest("POST", "/api/services/user?action=cc", {"public_key": that.public_key, "token": that.token}, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

Member.createSubscription = function(request) {
  return new Promise(function(resolve, reject) {
    request.subscription_for = 'space';

    sendRequest("POST", "/api/subscriptions", request, function(err, response) {
      if (err) {
        reject(err);
        return;
      }
      resolve(new Member(request['public_key'], response['token']));
    });
  });
}

Member.logIn = function(request) {
  return new Promise(function(resolve, reject) {
    sendRequest("POST", "/api/service/login", request, function(err, response) {
      if (err) {
        reject(err);
        return;
      }
      resolve(new Member(request['public_key'], response['token']));
    });
  });
}

Member.createPayment = function(request) {
  return new Promise(function(resolve, reject) {
    sendRequest("POST", "/api/payments", request, function(err, response) {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

module.exports = Member;
