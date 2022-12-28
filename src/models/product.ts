import * as mongoose from "mongoose";
import {product_types} from "../const.js";

const productSchema = new mongoose.Schema(
    {
        id: { type: String, required: true },
        name: { type: String, required: true },
        category: { type: String, required: true, enum: product_types},
        description: { type: String, required: true},
        price: { type: Number, required: true},
        stock: { type: Number, required: true},
        image: { type: String},
    },
    { timestamps: true }
);

export default mongoose.model("Product", productSchema, 'products');

export let product_props = ['name', 'category', 'description', 'price', 'stock', 'image'];
