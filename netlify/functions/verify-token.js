const jwt = require("jsonwebtoken");

exports.handler = async (event) => {
  const { ADMIN_EMAIL, JWT_SECRET } = process.env;
  if (!ADMIN_EMAIL || !JWT_SECRET) {
    return { statusCode: 500, body: "Missing server configuration" };
  }

  let token = null;
  if (event.queryStringParameters && event.queryStringParameters.token) {
    token = event.queryStringParameters.token;
  } else if (event.body) {
    try {
      const body = JSON.parse(event.body);
      token = body.token;
    } catch (err) {
      token = null;
    }
  }

  if (!token) {
    return { statusCode: 400, body: "Missing token" };
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || payload.email !== ADMIN_EMAIL) {
      return { statusCode: 401, body: "Unauthorized" };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    return { statusCode: 401, body: "Unauthorized" };
  }
};
