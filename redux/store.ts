"use client"

import { configureStore } from "@reduxjs/toolkit";
import leftSideBarReducer from "./features/leftsidebar/liftsidebarSlice";

const store = configureStore({
  reducer: {
    leftSidebar: leftSideBarReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
export default store;