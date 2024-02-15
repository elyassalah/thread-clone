import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  id: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  image: { type: String, required: true },
  bio: String,
  threads: [
    // this mean that one user can have multiple references to specific threads stored on the DB
    // one to many relation
    {
      type: mongoose.Schema.Types.ObjectId,
      // ref to another Schema(Table in MySql) , Thread is instance stored in DB
      ref: "Thread",
    },
  ],
  onboarded: {
    type: Boolean,
    default:false
  },
  // one user can belong to many communities (1 - M)
  communities: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community'
    
  }
});
// if the model is exist in DB so just add this instance or doc to the models User to avoid create 
// another model in the DB
// cause the first time the mongoose.models.User not going to exist
// so create the model (mongoose.model('User', userSchema)) in DB
// give it name User and the userSchema
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;