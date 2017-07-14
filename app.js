var express = require('express');
var app = express();
var bodyParser = require('body-parser')
var jwt = require('jsonwebtoken');
var auth = require('http-auth');
var twilio = require('twilio');

app.use(bodyParser.json());

//=========================================================================================
// These parameters should be provided by your deployment system.
// You can find these values in your Twilio Console.
// Never commit these into version control and take care to protect those on your service.
//=========================================================================================

var accountSid = "ACxxxxxxxx";
var accountSecret = "<insert account secret here>";
var instanceSid = "ISxxxxxxxx";
var signingKey = "SKxxxxxxxx";
// Credential SIDs are platform-specific and you should decide how
// to assign them to clients based on their used push platform (APNS, FCM etc).
var credentialSid = "CRxxxxxxxxx";

//=========================================================================================
// This endpoint is NOT authenticated or otherwise protected - use it only as testing/development
// and protect it properly when going to production - this endpoint should check your user's credentials
// and issue the token ONLY if this is a legitimate user of your service.
//=========================================================================================

app.get('/', function (req, res) {
    identity = req.user;
    if (!identity) res.status(400).send("User identity not provided")

    var roleSid = req.query.roleSid;

    var expiresIn = (req.query.expiresIn) ? req.query.expiresIn : (3600 * 24)
    var productId = (req.query.product) ? req.query.product : 'chat';

    var token = getToken({
        'accountSid': accountSid,
        "instanceSid": instanceSid,
        "identity": identity,
        "roleSid": roleSid,
        "credentialSid": credentialSid,
        "expiresInSeconds": parseInt(expiresIn),
        "productId" : productId
    })

    res.send(token)
});


var server = app.listen((process.env.PORT || 5000), function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('EXAMPLE token app listening at http://%s:%s', host, port);
});


function getTokenBody(input) {
    var now = parseInt(new Date().getTime() / 1000);
    var body = {
        "nbf": now,
        "exp": parseInt(now + input.expiresInSeconds),
        "iss": signingKey,
        "sub": input.accountSid,
        grants: {
            "identity": input.identity,
        }
    }

    body['grants'][input.productId] = {
        "service_sid": input.instanceSid
    };

    if (input.credentialSid) body.grants[input.productId].push_credential_sid = input.credentialSid;
    if (input.roleSid) body.grants[input.productId].deployment_role_sid = input.roleSid;
    return body;
}

var header = {
    "cty": "twilio-fpa;v=1",
    "alg": "HS256",
    "typ": "JWT"
}

function getToken(input) {
    body = getTokenBody(input)
    var token = jwt.sign(body, new Buffer(accountSecret, 'base64'), {
        headers: header,
        noTimestamp: true
    });
    return token;
}
