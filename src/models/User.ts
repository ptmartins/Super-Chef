import mongoose, { Schema, Model, Document } from "mongoose";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  favorites?: string[];
  resetToken?: string;
  resetTokenExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

type UserDocument = Omit<IUser, "_id"> & Document;

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    favorites: [{ type: Schema.Types.ObjectId, ref: "Recipe" }],
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
  },
  { timestamps: true }
);

const User: Model<UserDocument> =
  mongoose.models.User ?? mongoose.model<UserDocument>("User", UserSchema);

export default User;
