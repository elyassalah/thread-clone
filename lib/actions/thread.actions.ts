"use server";

import { revalidatePath } from "next/cache";

import { connectToDb } from "../mongoose";

import User from "../models/user.model";
import Thread from "../models/thread.model";
import Community from "../models/community.model";

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
  connectToDb();

  // Calculate the number of posts to skip based on the page number and page size.
  const skipAmount = (pageNumber - 1) * pageSize;

  // Create a query to fetch the posts that have no parent (top-level threads) (a thread that is not a comment/reply).
  const postsQuery = Thread.find({ parentId: { $in: [null, undefined] } })
    .sort({ createdAt: "desc" })
    .skip(skipAmount)
    .limit(pageSize)
    .populate({
      path: "author",
      model: User,
    })
    .populate({
      path: "community",
      model: Community,
    })
    .populate({
      path: "children", // Populate the children field
      populate: {
        path: "author", // Populate the author field within children
        model: User,
        select: "_id name parentId image", // Select only _id and username fields of the author
      },
    });

  // Count the total number of top-level posts (threads) i.e., threads that are not comments.
  const totalPostsCount = await Thread.countDocuments({
    parentId: { $in: [null, undefined] },
  }); // Get the total count of posts

  const posts = await postsQuery.exec();

  const isNext = totalPostsCount > skipAmount + posts.length;

  return { posts, isNext };
}

interface Params {
  text: string;
  author: string;
  communityId: string | null;
  path: string;
}

export async function createThread({
  text,
  author,
  communityId,
  path,
}: Params) {
  try {
    connectToDb();

    const communityIdObject = await Community.findOne(
      { id: communityId },
      { _id: 1 }
    );

    const createdThread = await Thread.create({
      text,
      author,
      community: communityIdObject, // Assign communityId if provided, or leave it null for personal account
    });

    // Update User model
    await User.findByIdAndUpdate(author, {
      $push: { threads: createdThread._id },
    });

    if (communityIdObject) {
      // Update Community model
      await Community.findByIdAndUpdate(communityIdObject, {
        $push: { threads: createdThread._id },
      });
    }

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to create thread: ${error.message}`);
  }
}

async function fetchAllChildThreads(threadId: string): Promise<any[]> {
  const childThreads = await Thread.find({ parentId: threadId });

  const descendantThreads = [];
  for (const childThread of childThreads) {
    const descendants = await fetchAllChildThreads(childThread._id);
    descendantThreads.push(childThread, ...descendants);
  }

  return descendantThreads;
}

export async function deleteThread(id: string, path: string): Promise<void> {
  try {
    connectToDb();

    // Find the thread to be deleted (the main thread)
    const mainThread = await Thread.findById(id).populate("author community");

    if (!mainThread) {
      throw new Error("Thread not found");
    }

    // Fetch all child threads and their descendants recursively
    const descendantThreads = await fetchAllChildThreads(id);

    // Get all descendant thread IDs including the main thread ID and child thread IDs
    const descendantThreadIds = [
      id,
      ...descendantThreads.map((thread) => thread._id),
    ];

    // Extract the authorIds and communityIds to update User and Community models respectively
    const uniqueAuthorIds = new Set(
      [
        ...descendantThreads.map((thread) => thread.author?._id?.toString()), // Use optional chaining to handle possible undefined values
        mainThread.author?._id?.toString(),
      ].filter((id) => id !== undefined)
    );

    const uniqueCommunityIds = new Set(
      [
        ...descendantThreads.map((thread) => thread.community?._id?.toString()), // Use optional chaining to handle possible undefined values
        mainThread.community?._id?.toString(),
      ].filter((id) => id !== undefined)
    );

    // Recursively delete child threads and their descendants
    await Thread.deleteMany({ _id: { $in: descendantThreadIds } });

    // Update User model
    await User.updateMany(
      { _id: { $in: Array.from(uniqueAuthorIds) } },
      { $pull: { threads: { $in: descendantThreadIds } } }
    );

    // Update Community model
    await Community.updateMany(
      { _id: { $in: Array.from(uniqueCommunityIds) } },
      { $pull: { threads: { $in: descendantThreadIds } } }
    );

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to delete thread: ${error.message}`);
  }
}

export async function fetchThreadById(threadId: string) {
  connectToDb();

  try {
    const thread = await Thread.findById(threadId)
      .populate({
        path: "author",
        model: User,
        select: "_id id name image",
      }) // Populate the author field with _id and username
      .populate({
        path: "community",
        model: Community,
        select: "_id id name image",
      }) // Populate the community field with _id and name
      .populate({
        path: "children", // Populate the children field
        populate: [
          {
            path: "author", // Populate the author field within children
            model: User,
            select: "_id id name parentId image", // Select only _id and username fields of the author
          },
          {
            path: "children", // Populate the children field within children
            model: Thread, // The model of the nested children (assuming it's the same "Thread" model)
            populate: {
              path: "author", // Populate the author field within nested children
              model: User,
              select: "_id id name parentId image", // Select only _id and username fields of the author
            },
          },
        ],
      })
      .exec();

    return thread;
  } catch (err) {
    console.error("Error while fetching thread:", err);
    throw new Error("Unable to fetch thread");
  }
}

export async function addCommentToThread(
  threadId: string,
  commentText: string,
  userId: string,
  path: string
) {
  connectToDb();

  try {
    // Find the original thread by its ID
    const originalThread = await Thread.findById(threadId);

    if (!originalThread) {
      throw new Error("Thread not found");
    }

    // Create the new comment thread
    const commentThread = new Thread({
      text: commentText,
      author: userId,
      parentId: threadId, // Set the parentId to the original thread's ID
    });

    // Save the comment thread to the database
    const savedCommentThread = await commentThread.save();

    // Add the comment thread's ID to the original thread's children array
    originalThread.children.push(savedCommentThread._id);

    // Save the updated original thread to the database
    await originalThread.save();

    revalidatePath(path);
  } catch (err) {
    console.error("Error while adding comment:", err);
    throw new Error("Unable to add comment");
  }
}

// "use server";
// /*
// database actions should be process in server side
// and we cannot directly create database actions through the browser side
// the reason is cors (cross origin request) it does not allow it
// thats why we develop apis and new servers databases are mostly server or API services
// */
// import { revalidatePath } from "next/cache";
// import Thread from "../models/thread.model";
// import { connectToDb } from "../mongoose";
// import User from "../models/user.model";

// interface Params {
//   text: string;
//   author: string;
//   communityId: string | null;
//   path: string;
// }

// export async function createThread({
//   text,
//   author,
//   communityId,
//   path,
// }: Params) {
//   try {
//     await connectToDb();
//     const createdThread = await Thread.create({
//       text,
//       author,
//       // community its the id of community if the author is member of some community and post on the community
//       // and can be null if not
//       community: communityId,
//     });

//     // Update user model
//     // by push to his threads the new thread that he created
//     await User.findByIdAndUpdate(author, {
//       $push: { threads: createdThread._id },
//     });
//     // revalidatePath and pass in the path which is going to
//     // make sure that changes happen immediately on our next.js website
//     revalidatePath(path);
//   } catch (error: any) {
//     throw new Error(`Failed creating Thread => ${error.message}`);
//   }
// }

// export async function fetchPosts(pageNumber = 1, pageSize = 20) {
//   try {
//     // we fetch the posts and also implement the pagination (numbering of pages)
//     await connectToDb();
//     // Calculate the number of posts to skip
//     // every time we call it then give us new posts by using the skip
//     // first call pageNumber will be 1 so not skip any thing
//     // then from page 2 and above will skip the previous posts depend on skip amount
//     const skipAmount = (pageNumber - 1) * pageSize;
//     // fetch the posts that have no parents (top-level threads...)
//     const postsQuery = Thread.find({
//       // $in mean is in, then the value we wanna to search on it or the type
//       parentId: { $in: [null, undefined] },
//     })
//       .sort({ createdAt: "desc" })
//       .skip(skipAmount)
//       .limit(pageSize)
//       .populate({
//         path: "author",
//         model: User,
//       })
//       .populate({
//         path: "children",
//         populate: {
//           path: "author",
//           model: User,
//           select: "_id name parentId image",
//         },
//       });
//     const totalPostsCount = await Thread.countDocuments({
//       parentId: { $in: [null, undefined] },
//     });
//     const posts = await postsQuery.exec();
//     // to check do we have a next page
//     const isNext = totalPostsCount > skipAmount + posts.length;
//     return { posts, isNext };
//     // populate to give also the info of author of the post cause we make relation
//     // so author it has reference to the user of the post
//   } catch (error) {}
// }

// export async function fetchThreadById(id: string) {
//   try {
//     /*
//     here we have more recursively cause there multi-level commenting thread
//     -> thread general
//         -comment1 on general thread (comment also be thread)
//           - comment on the comment1 (cause as we say the comment is thread and have also comment)
//             so on ---
//         -comment2 on general thread (comment also be thread)
//           - comment on the comment2 (cause as we say the comment is thread and have also comment)
//             so on ---
//     */
//     await connectToDb();
//     // TODO: Populate Community
//     const thread = await Thread.findById(id)
//       .populate({
//         path: "author",
//         model: User,
//         select: "_id id name image",
//       })
//       .populate({
//         path: "children",
//         populate: [
//           {
//             path: "author",
//             model: User,
//             select: " _id id name parentId image",
//           },
//           {
//             path: "children",
//             model: Thread,
//             populate: {
//               path: "author",
//               model: User,
//               select: "_id id name parentId image",
//             },
//           },
//         ],
//       })
//       .exec();
//     return thread;
//   } catch (error: any) {
//     throw new Error(`Failed fetch thread by id => ${error.message}`);
//   }
// }

// export async function addCommentToThread(
//   threadId: string,
//   commentText: string,
//   userId: string,
//   path: string
// ) {
//   try {
//     await connectToDb();
//     // adding a comment
//     // find the original thread by id
//     const originalThread = await Thread.findById(threadId);
//     if (!originalThread) {
//       throw new Error("Thread not found");
//     }
//     // Crate a new thread with the comment text
//     const commentThread = new Thread({
//       text: commentText,
//       author: userId,
//       parentId: threadId,
//     });
//     // save the new thread
//     const savedCommentThread = await commentThread.save();

//     // update the original thread to include the new comment
//     originalThread.children.push(savedCommentThread._id);

//     // save the original thread
//     await originalThread.save();

//     revalidatePath(path);
//   } catch (error: any) {
//     throw new Error(`Error adding comment to thread ${error.message}`);
//   }
// }

// /*
//     --In Next.js, the revalidate property in the getStaticProps and getServerSideProps functions
//     allows you to specify how often(in seconds) a page should revalidate(i.e., regenerate) after
//     the initial request.This is useful for pages that are generated statically at build time(getStaticProps)
//     or on each request(getServerSideProps), as it enables you to update the page content without redeploying
//     the entire application.

//     --However, there might be scenarios where you want to trigger a revalidation for specific pages outside
//     of the default revalidation interval specified by the revalidate property.This is where the revalidatePath
//     function comes into play.

//     --The revalidatePath function allows you to trigger a revalidation for a specific page path programmatically.
//     It accepts the path of the page(relative URL) as an argument and initiates the revalidation
//     process for that page.
//     This can be useful when certain events occur in your application that require immediate updates
//     to specific pages  */
// ///////////////

// /*
//     Revalidation in Next.js refers to the process of regenerating a page's content
//     based on the data fetched in getStaticProps or getServerSideProps.
//     --When a page is initially requested, Next.js generates the page content based on the data fetched
//     in the getStaticProps(for static generation) or getServerSideProps(for server - side rendering) function.
//     --By default, Next.js caches the generated page content and serves it on subsequent requests
//     without regenerating it until the revalidation period specified by the revalidate property elapses.
//     --When a revalidation is triggered (either by the default revalidation interval or
//     manually using revalidatePath), Next.js regenerates the page content by re-running the getStaticProps
//     or getServerSideProps function, updating the cached content with fresh data.
//     --This process ensures that the page content stays up-to-date with the latest data,
//     even for statically generated pages. */

// //TODO:
// //useState in React:
// /*
//   --useState is a React Hook that allows components to manage local state.
//   --It provides a way to declare state variables within functional components and update their
//   values in response to user interactions or other events.
//   --State managed by useState is local to the component where it's defined and
//   doesn't persist across page reloads or navigation.
//   --useState is typically used for managing UI-related state within components,
//   such as form input values, toggling visibility, or tracking component-specific data.
//   */

// /*
//   --Revalidation in Next.js is about updating the content of dynamically generated pages
//    based on external data sources, ensuring that the content remains fresh over time.
//   --useState in React is about managing local component state for UI-related interactions
//   and does not involve server-side data fetching or caching mechanisms.
//   */

// /*
//   --Redux is a state management library primarily used with React, although it can be used with
//   other frameworks or even vanilla JavaScript applications. It provides a predictable state container
//   for JavaScript apps by enforcing a strict unidirectional data flow and a centralized store to
//   manage application state.

//   Here's an overview of key concepts in Redux:

//   --Store: The store is a JavaScript object that holds the entire state tree of your application.
//   It is the single source of truth for your application's state. You can think of it as a centralized
//   database for your application's data.

//   --Actions: Actions are plain JavaScript objects that represent payloads of information
//   that send data from your application to your store. They are the only source of information
//   for the store and must have a type property that indicates the type of action being performed.
//   They are typically created by action creator functions.

//   --Reducers: Reducers are functions that specify how the application's state changes in response
//   to actions sent to the store. They take the previous state and an action as arguments and return
//   the next state. Reducers should be pure functions, meaning they should not mutate the state,
//   but return a new state object.

//   --Dispatch: Dispatch is a function provided by the Redux store that allows you to dispatch actions
//   to change the state. When an action is dispatched, it is sent to all reducers, which may respond
//   to it by updating the state accordingly.

//   --Selectors: Selectors are functions used to extract specific pieces of data from the Redux store state.
//   They are often used to compute derived data or to filter the state before presenting it to components.

//   --Redux is commonly used in large-scale applications where managing state across multiple components
//   or handling complex state interactions becomes challenging. It promotes a structured approach to
//   managing application state and encourages separation of concerns between logic and presentation.

//   --While Redux adds some boilerplate code compared to simpler state management solutions like
//   React's useState hook or context API, it offers benefits such as centralized state management,
//   predictable state updates, and powerful debugging capabilities with tools like Redux DevTools.

//   */
