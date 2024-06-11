import mongoose from "mongoose";

const entrySchema = new mongoose.Schema({
    id: { type: Number, unique: true, required: true },
    name: String,
    score: Number,
    age: Number,
    city: String,
    gender: String
});

export const Entry = mongoose.model('Entry', entrySchema);


