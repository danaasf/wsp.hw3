import * as mongoose from "mongoose";
import {permissions} from "../const.js";

const usersSchema = new mongoose.Schema(
    {
        username: { type: String, required: true},
        password: { type: String, required: true},
        permission: { type: String, required: true, enum:permissions}
    },
    { timestamps: true }
);


export default mongoose.model("User", usersSchema, 'users');
