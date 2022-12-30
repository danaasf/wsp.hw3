import { IncomingMessage, ServerResponse } from "http";
import jwt from "jsonwebtoken";
import * as bcrypt from "bcrypt";
import {ERROR_400, ERROR_401, ERROR_403, permissions} from "./const.js";
import {isStr, tryParseJSONObject} from "./validations.js";
import User from "./models/user.js";

const secretKey = process.env.SECRET_KEY;
// const secretKey = process.env.SECRET_KEY || "your_secret_key";
export const saltRounds:number = 10  // choose hash saltRounds

// Verify JWT token
const verifyJWT = (token: string) => {
  try {
    return jwt.verify(token, secretKey);
    // Read more here: https://github.com/auth0/node-jsonwebtoken#jwtverifytoken-secretorpublickey-options-callback
    // Read about the diffrence between jwt.verify and jwt.decode.
  } catch (err) {
    return false;
  }
};

// Check user permissions
const checkPermission = (minimal_permission:string, user_permission:string) =>{
  const user_idx = permissions.indexOf(user_permission)
  const min_idx = permissions.indexOf(minimal_permission)
  return min_idx <= user_idx;
}

// Middelware for all protected routes. You need to expend it, implement premissions and handle with errors.
export const protectedRout = async (req: IncomingMessage, res: ServerResponse, minimal_permission: string = 'W') => {
  // throws an exception if user has no permissions
  let authHeader = req.headers["authorization"] as string;
  // authorization header needs to look like that: Bearer <JWT>.
  let authHeaderSplited = authHeader && authHeader.split(" ");
  const token = authHeaderSplited && authHeaderSplited[0] === 'Bearer' && authHeaderSplited[1];
  if (!token) {
    res.statusCode = 401;
    throw "No token.";
  }

  // Verify JWT token
  let user = verifyJWT(token);
  if (!user) {
    res.statusCode = 401;
    throw "Failed to verify JWT.";
  }

  user = user?.db_user
  const currentUser = await User.findOne({username: user.username});
  // check user permissions to access this route
  const user_permission = currentUser?.permission
   if (!checkPermission(minimal_permission, user_permission)){
     res.statusCode = 403;
     throw ERROR_403;
   }

  // We are good!
  return user;
};

export const loginRoute = (req: IncomingMessage, res: ServerResponse) => {
  // Read request body.
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", async () => {
    try {
      res.statusCode = 400;  // Bad Request until proved otherwise
      // Parse request body as JSON
      const credentials = tryParseJSONObject(body);
      const username = credentials?.username;
      const password = credentials?.password;
      // Check if valid and not empty
      if (!isStr(username) || username.length <= 0 ||
          !isStr(password) || password.length <= 0 ||
          (Object.keys(credentials).length !== 2) ){
        throw "Invalid username or password."
      }

      // Check if username exist
      const out = await User.find({ username: username}).exec();
      if (out.length === 0){
        res.statusCode = 401;
        throw "Invalid username or password."
      }

      const db_user = out[0]
      // Compare password hash & salt.
      const passwordMatch = await bcrypt.compare(credentials.password, db_user.password);
      if (!passwordMatch){
        res.statusCode = 401;
        throw "Invalid username or password."
      }

      // Happy flow from here - Create JWT token.
      // This token contain the database entry of the current user
      const token = jwt.sign({db_user}, secretKey, {
        expiresIn: 86400, // expires in 24 hours
      });
      res.statusCode = 200;
      res.end(
          JSON.stringify({
            token: token,
          })
      );
    }
    catch (e) {
      // Something happened
      const message = isStr(e) ? e : ERROR_400 // Prevent presenting DB exceptions to the user.
      res.end(JSON.stringify({
        message: message
      }));
    }
  });
}


export const signupRoute = (req: IncomingMessage, res: ServerResponse) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", async () => {
    try {
      // Parse request body as JSON
      const credentials = tryParseJSONObject(body);
      // Check if input types and values are correct
      if (!credentials) {
        throw ERROR_400
      }

      const username = credentials?.username;
      const password = credentials?.password;
      // Check if valid and not empty
      if (!isStr(username) || username.length <= 0 ||
          !isStr(password) || password.length <= 0 ||
          (Object.keys(credentials).length !== 2) )
      {
          throw ERROR_400
      }

      // Check if username already exists in the system.
      let username_exist = await User.exists({username: credentials.username});
      if (username_exist !== null){
        throw "Specified username already exists in the system. Change username or log in."
      }

      const salt:string = await bcrypt.genSalt(saltRounds);
      const hash_password = await bcrypt.hash(password, salt);  // salt is incorporated into the hashed password
      const user = new User({
        username: credentials.username,
        password: hash_password,
        permission: 'W'
      });

      // Mongoose automatically will insert this document to our collection!
      // if there is a type error, it will throw an exception
      const dbRes = await user.save();

      // Happy flow
      res.statusCode = 201;
      res.setHeader("Content-Type", "application/json");
      res.write(JSON.stringify({message: "Success."}));
      res.end();
    }
    catch (e) {
      // Something happened
      const message = isStr(e) ? e : ERROR_400 // Prevent presenting DB exceptions to the user.
      res.statusCode = 400;  // Bad request
      res.end(JSON.stringify({
        message: message
      }));
    }

  });
};

export const permissionRout = (req: IncomingMessage, res: ServerResponse) => {
  // Read request body.
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", async () => {
    try {
      const out = await protectedRout(req, res, 'A')
      res.statusCode = 400;  // response is Bad request 400 until proved otherwise
      // Parse request body as JSON
      const user = tryParseJSONObject(body);
      // Check if input types and values are correct
      if (!user) {
        throw ERROR_400
      }

      // Check username and permission fields validity
      if (!isStr(user?.username) || !isStr(user?.permission) ||
          ((user?.permission !== 'W') && (user?.permission !== 'M')) ||
          (Object.keys(user).length !== 2)
      ){
        throw ERROR_400
      }

      const filter = { username: user.username };
      const update = { permission: user.permission };
      // doc is the document _before_ update was applied
      await User.findOneAndUpdate(filter, update);

      // Happy flow
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.write(JSON.stringify({message: "Success."}));
      res.end();
    }
    catch (e) {
      // Something happened
      const message = isStr(e) ? e : ERROR_400 // Prevent presenting DB exceptions to the user.
      res.end(JSON.stringify({
        message: message
      }));
    }
  });
};
