import mongoose from "mongoose";
import { object } from "zod";

const threadSchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Community",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // parentId in case this thread is a comment then this id is for the thread that this comment Follow it
  parentId: {
    type: String,
  },
  // children its the comments of this thread
  // one thread can have manipulate threads as children(comments)
  children: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
    },
  ],
});

const Thread = mongoose.models.Thread || mongoose.model("Thread", threadSchema);

export default Thread;

// multi-level commenting functionality
// Thread original
//  -> Thread comment1 on Thread original
//  -> Thread comment2 on Thread original
//    -> Thread comment3 on Thread comment 2 cause it self is thread(parent) can have also comments
