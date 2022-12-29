import { IncomingMessage, ServerResponse } from "http";
import { protectedRout } from "./auth.js";
import {ERROR_400, ERROR_404, product_types} from "./const.js";
import Product, {product_props} from './models/product.js';
import {isStr, tryParseJSONObject} from "./validations.js"
import { v4 as uuidv4 } from "uuid";
import User from "./models/user.js";


export const createRoute = (url: string, method: string, output:{[key:string]: string}) => {
  let splitted_url = url.split('/')
  if (splitted_url.length <=1){
    output.url_err = ERROR_404;
  }

  let url_;
  try {
    url_ = splitted_url.slice(0, 3).join("/");
    output.id_or_type = splitted_url.slice(3, splitted_url.length + 1).join("/");
  }
  catch (e) {
    output.url_err = ERROR_404;
  }

  output.route = `${method} ${url_}`
};

export const defaultRoute = (req: IncomingMessage, res: ServerResponse) => {
  res.statusCode = 404;
  res.setHeader("Content-Type", "text/html");
  res.end(JSON.stringify({
    message: "Not Found."
  }));
};


export const newProductRout = (req: IncomingMessage, res: ServerResponse) => {
  // Read request body.
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });


  req.on("end", async () => {
    try {
      const out = await protectedRout(req, res, 'M')

      res.statusCode = 400;  // response is Bad request 400 until proved otherwise
      // Parse request body as JSON
      const product_info = tryParseJSONObject(body);
      // Check if input types and values are correct
      if (!product_info) {
        throw ERROR_400
      }

      // Check price and stock integers
      if (!Number.isInteger(product_info?.stock) || (!Number.isInteger(product_info?.price)) ||
          (product_info?.stock < 0) || (product_info?.price < 0) || (product_info?.price > 1000) ||
          product_info?.id
      ){
        throw ERROR_400
      }

      if (product_info?.id) {
        const exists = await Product.findOne({id: product_info?.id});
        if (exists) {
          throw ERROR_400;
        }
      }

      const new_prod_id = uuidv4().substring(0, 8);
      let prod;
      try {
         prod = new Product({
          id: new_prod_id,
          name: product_info?.name,
          category: product_info?.category,
          description: product_info?.description,
          price: product_info?.price,
          stock: product_info?.stock,
          image: product_info?.image,
        });
      } catch (e) {
        throw ERROR_400;
      }

      // Mongoose automatically will insert this document to our collection!
      // if there is a type error, it will throw an exception
      const dbRes = await prod.save();

      // Happy flow
      res.statusCode = 201;
      res.setHeader("Content-Type", "application/json");
      res.write(JSON.stringify({id: new_prod_id}));
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

export const getProductRout = (req: IncomingMessage, res: ServerResponse, id_or_type:string) => {
  // Read request body.
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    try {
      const out = await protectedRout(req, res, 'W')

      res.statusCode = 400;  // response is Bad request 400 until proved otherwise
      // Parse request body as JSON
      const parsed_body = tryParseJSONObject(body);
      // Check if input is not empty (not allowed)
      if (parsed_body) {
        throw ERROR_400
      }

      let getById = false;
      let products;
      if (product_types.includes(id_or_type)){
        products = await Product.find({ category: id_or_type }).lean();
      }
      else{
        getById = true;
        products = [await Product.findOne({ id: id_or_type }).lean()];
      }

      if((Object.keys(products).length === 0) ||
          (Object.keys(products).length > 0 && products[0] === null)){
        // Not found 404
        res.statusCode = 404;
        throw ERROR_404
      }
      else {
        // Happy flow
        res.statusCode = 200;
        // create presentable product
        products.forEach((prod) => {
          delete prod['_id'];
          delete prod['createdAt'];
          delete prod['updatedAt'];
          delete prod['__v'];
        })

        res.setHeader("Content-Type", "application/json");
        res.write(getById ? JSON.stringify(products.pop()) : JSON.stringify(products));
        res.end();
      }
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

export const deleteProductRout = (req: IncomingMessage, res: ServerResponse, id_or_type:string) => {
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
      const parsed_body = tryParseJSONObject(body);
      // Check if input is not empty (not allowed)
      if (parsed_body) {
        throw ERROR_400
      }

      let products = await Product.deleteOne({ id: id_or_type }).lean();

      if(products.deletedCount === 0){
        // Not found 404
        res.statusCode = 404;
        throw ERROR_404
      }
      else {
        // Happy flow
        res.statusCode = 200;
        res.end();
      }
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

export const changeProductRout = (req: IncomingMessage, res: ServerResponse, id_or_type:string) => {
  // Read request body.
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });


  req.on("end", async () => {
    try {
      const out = await protectedRout(req, res, 'M')

      res.statusCode = 400;  // response is Bad request 400 until proved otherwise
      // Parse request body as JSON
      const product_info = tryParseJSONObject(body);
      // Check if input types and values are correct
      if (!product_info || Object.keys(product_info).length === 0) {
        throw ERROR_400;
      }

      // Check input json keys validity. Assuming 'id' can't be changed
      for (let key in product_info) {
        // wrong key of empty key
        if (!product_props.includes(key) || !product_info.hasOwnProperty(key)) {
          throw ERROR_400;
        }
        // bad key values
        if ((key === 'stock' && (product_info[key] < 0)) ||
            (key === 'price' && product_info[key] < 0)){
          throw ERROR_400;
        }
        // bad category input
        if (key === 'category' && !product_types.includes(product_info[key])){
          throw ERROR_400;
        }
      }

      const filter = { id: id_or_type };
      // old_prod is the document _before_ update was applied
      let old_prod = await Product.findOneAndUpdate(filter, product_info);
      if(Object.keys(old_prod).length === 0){
        // Not found 404
        res.statusCode = 404;
        throw ERROR_404
      }

      // Happy flow
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.write(JSON.stringify({id: id_or_type}));
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
