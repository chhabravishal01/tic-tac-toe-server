var jwt = require('jsonwebtoken');

var key = "secretKey";

exports.generateToken = function (details) {
  return jwt.sign(details, key);
}

exports.verifyToken = function (token) {
  token = token.split(' ')[1];
  
  return jwt.verify(token, key, (err, decode) => decode )
}