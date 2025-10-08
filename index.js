import express from "express";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import path from "path";

// get config vars
dotenv.config();

const {TMDB_TOKEN} = process.env;

const app = express();
const serve_static_asset = express.static("public");
app.use(cookieParser());

const shell_path = path.join(import.meta.dirname, 'public', 'index.html');

app.use("/", (req, res, next) => {
  if (req.headers["sec-fetch-mode"] === "navigate") {
    res.sendFile(shell_path);
  } else {
    serve_static_asset(req, res, next);
  }
});

app.get('/api/session', (req, res) => {
  try {
    // Generate a unique, random string to use as the CSRF token.
    const csrfToken = crypto.randomUUID();

    // Create the JWT payload. It contains the CSRF token.
    const payload = { csrfToken };
    const token = jwt.sign(payload, TMDB_TOKEN, { expiresIn: '3h' });

    // Send the JWT back to the client in an http-only cookie.
    // This cookie is secure and cannot be accessed by client-side JavaScript.
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7200000 // 3 hours
    });

    // Send the CSRF token itself back in the JSON response.
    // The client-side JS will read this and use it in a request header.
    res.json({ csrfToken });

  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});


// 3. The Protected API Proxy Route, now with JWT-based CSRF protection
app.get('/api/tmdb-proxy', async (req, res) => {
  try {
    // a. Get the JWT from the http-only cookie
    const token = req.cookies.auth_token;
    if (!token) {
      return res.status(401).json({ error: 'Authentication token not found.' });
    }

    // b. Get the CSRF token from the custom request header
    const csrfTokenFromHeader = req.header('x-csrf-token');
    if (!csrfTokenFromHeader) {
      return res.status(403).json({ error: 'CSRF token not found in header.' });
    }

    // c. Verify the JWT and extract the payload
    const decoded = jwt.verify(token, TMDB_TOKEN);

    // d. **THE CRITICAL CHECK**: Compare the token from the header with the one in the JWT payload
    if (decoded.csrfToken !== csrfTokenFromHeader) {
      return res.status(403).json({ error: 'Invalid CSRF token.' });
    }

    // If all checks pass, proceed to proxy the request to TMDB
    console.log('CSRF token valid. Proxying request to TMDB...');

    console.log(req.header('x-tmdb-path'));
    console.log(TMDB_TOKEN);

    const response = await fetch(`https://api.themoviedb.org/3${req.header('x-tmdb-path')}`, {
        headers: {
            'Authorization': `Bearer ${TMDB_TOKEN}`,
            'Accept': 'application/json'
        }
    });
    res.json(await response.json());
  } catch (error) {
    // Handle errors from JWT verification or the TMDB API call
    console.error('Error in proxy:', error.message);
    if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Invalid authentication token.' });
    }
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

try {
    if (TMDB_TOKEN) {
        const {success} = await (await fetch("https://api.themoviedb.org/3//authentication", {headers: {Authorization: `Bearer ${TMDB_TOKEN}`}})).json();
        if (success) {
            console.log("TMDB_TOKEN verified");
            await new Promise(resolve => app.listen(process.env.port || 3000, resolve));
            console.log("Server started");
        }
        else {
            console.error("TMDB_TOKEN invalid or missing");
        }
    } else {
            console.error("TMDB_TOKEN missing");
    }

} catch (e) {
    console.error("Unable to verify TMDB key");

}

