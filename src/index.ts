import { createServer, IncomingMessage, ServerResponse } from "http";
import * as bcrypt from "bcrypt";

// import with .js, and not ts.
// for more info: https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/#type-in-package-json-and-new-extensions
import {
  defaultRoute,
  createRoute,
  newProductRout,
  getProductRout,
  deleteProductRout,
  changeProductRout
} from "./routes.js";
import {
  ERROR_404,
  NEW_PRODUCT,
  LOGIN,
  PERMISSION,
  SIGNUP,
  GET_PRODUCT,
  CHANGE_PRODUCT,
  DELETE_PRODUCT
} from "./const.js";
import {loginRoute, permissionRout, saltRounds, signupRoute} from "./auth.js";
import * as mongoose from "mongoose";
import User from "./models/user.js";
import Product from "./models/product.js";

const port = process.env.PORT || 3000;
// Connect to mongoDB
const dbURI = "mongodb+srv://admin:admin@hw3-rest-api.vsqxthw.mongodb.net/hw3-rest-api?retryWrites=true&w=majority";
await mongoose.connect(dbURI);
await Product.deleteMany({});
await User.deleteMany({});



const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  let output:{[key:string]: string} = {
    'route':'',
    'id_or_type':'',
    'url_err':''
  }
  createRoute(req.url, req.method, output);
  // If given URL does not meet the basic template, return an error 404
  if (output.url_err === ERROR_404){
    defaultRoute(req, res);
  }

  if (output.route === LOGIN && output.id_or_type === ''){
    loginRoute(req, res);
  }
  else if (output.route === SIGNUP && output.id_or_type === ''){
    signupRoute(req, res);
  }
  else if (output.route === PERMISSION && output.id_or_type === ''){
    permissionRout(req, res);
  }
  else if (output.route === NEW_PRODUCT && output.id_or_type === ''){
    newProductRout(req, res);
  }
  else if (output.route === GET_PRODUCT && output.id_or_type !== ''){
    getProductRout(req,res,output.id_or_type)
  }
  else if (output.route === CHANGE_PRODUCT && output.id_or_type !== ''){
    changeProductRout(req,res,output.id_or_type)
  }
  else if (output.route === DELETE_PRODUCT && output.id_or_type !== ''){
    deleteProductRout(req,res,output.id_or_type)
  }
  else{
    defaultRoute(req, res);
  }
});

const createAdmin = async () => {
  let admin_username = 'admin';
  let admin_pass = 'admin'
  // Check if admin already exists in the system.
  let username_exist = await User.exists({username: admin_username});
  if (username_exist !== null) return

  const salt: string = await bcrypt.genSalt(saltRounds);
  const hash_password = await bcrypt.hash(admin_pass, salt);  // salt is incorporated into the hashed password
  const user = new User({
    username: admin_username,
    password: hash_password,
    permission: 'A'
  });

  // Mongoose automatically will insert this document to our collection!
  // if there is a type error, it will throw an exception
  const dbRes = await user.save();
}

await createAdmin()
server.listen(port);
console.log(`Server running! port ${port}`);
