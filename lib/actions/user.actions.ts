"use server";

import { FilterQuery, SortOrder } from "mongoose";
import { revalidatePath } from "next/cache";

import Community from "../models/community.model";
import Thread from "../models/thread.model";
import User from "../models/user.model";

import { connectToDb } from "../mongoose";

export async function fetchUser(userId: string) {
  try {
    connectToDb();

    return await User.findOne({ id: userId }).populate({
      path: "communities",
      model: Community,
    });
  } catch (error: any) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
}

interface Params {
  userId: string;
  username: string;
  name: string;
  bio: string;
  image: string;
  path: string;
}

export async function updateUser({
  userId,
  bio,
  name,
  path,
  username,
  image,
}: Params): Promise<void> {
  try {
    connectToDb();

    await User.findOneAndUpdate(
      { id: userId },
      {
        username: username.toLowerCase(),
        name,
        bio,
        image,
        onboarded: true,
      },
      { upsert: true }
    );

    if (path === "/profile/edit") {
      revalidatePath(path);
    }
  } catch (error: any) {
    throw new Error(`Failed to create/update user: ${error.message}`);
  }
}

export async function fetchUserPosts(userId: string) {
  try {
    connectToDb();

    // Find all threads authored by the user with the given userId
    const threads = await User.findOne({ id: userId }).populate({
      path: "threads",
      model: Thread,
      populate: [
        {
          path: "community",
          model: Community,
          select: "name id image _id", // Select the "name" and "_id" fields from the "Community" model
        },
        {
          path: "children",
          model: Thread,
          populate: {
            path: "author",
            model: User,
            select: "name image id", // Select the "name" and "_id" fields from the "User" model
          },
        },
      ],
    });
    return threads;
  } catch (error) {
    console.error("Error fetching user threads:", error);
    throw error;
  }
}

// Almost similar to Thead (search + pagination) and Community (search + pagination)
export async function fetchUsers({
  userId,
  searchString = "",
  pageNumber = 1,
  pageSize = 20,
  sortBy = "desc",
}: {
  userId: string;
  searchString?: string;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: SortOrder;
}) {
  try {
    connectToDb();

    // Calculate the number of users to skip based on the page number and page size.
    const skipAmount = (pageNumber - 1) * pageSize;

    // Create a case-insensitive regular expression for the provided search string.
    const regex = new RegExp(searchString, "i");

    // Create an initial query object to filter users.
    const query: FilterQuery<typeof User> = {
      id: { $ne: userId }, // Exclude the current user from the results.
    };

    // If the search string is not empty, add the $or operator to match either username or name fields.
    if (searchString.trim() !== "") {
      query.$or = [
        { username: { $regex: regex } },
        { name: { $regex: regex } },
      ];
    }

    // Define the sort options for the fetched users based on createdAt field and provided sort order.
    const sortOptions = { createdAt: sortBy };

    const usersQuery = User.find(query)
      .sort(sortOptions)
      .skip(skipAmount)
      .limit(pageSize);

    // Count the total number of users that match the search criteria (without pagination).
    const totalUsersCount = await User.countDocuments(query);

    const users = await usersQuery.exec();

    // Check if there are more users beyond the current page.
    const isNext = totalUsersCount > skipAmount + users.length;

    return { users, isNext };
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

export async function getActivity(userId: string) {
  try {
    connectToDb();

    // Find all threads created by the user
    const userThreads = await Thread.find({ author: userId });

    // Collect all the child thread ids (replies) from the 'children' field of each user thread
    const childThreadIds = userThreads.reduce((acc, userThread) => {
      return acc.concat(userThread.children);
    }, []);

    // Find and return the child threads (replies) excluding the ones created by the same user
    const replies = await Thread.find({
      _id: { $in: childThreadIds },
      author: { $ne: userId }, // Exclude threads authored by the same user
    }).populate({
      path: "author",
      model: User,
      select: "name image _id",
    });

    return replies;
  } catch (error) {
    console.error("Error fetching replies: ", error);
    throw error;
  }
}

// "use server";

// import { revalidatePath } from "next/cache";
// import User from "../models/user.model";
// import { connectToDb } from "../mongoose";
// import Thread from "../models/thread.model";
// import { FilterQuery, SortOrder } from "mongoose";

// // there as actions it we used to manipulate with db without has any route and backend code
// // just using actions and this the powerful of nextJs
// // and we can specify when specific code should be render only on the server
// interface Params {
//   userId: string;
//   username: string;
//   name: string;
//   bio: string;
//   image: string;
//   path: string;
// }
// export async function updateUser({
//   userId,
//   username,
//   name,
//   bio,
//   image,
//   path,
// }: Params): Promise<void> {
//   await connectToDb();
//   try {
//     await User.findOneAndUpdate(
//       // the id of the object going to find
//       { id: userId },
//       // send the data that will be updated
//       {
//         username: username.toLowerCase(),
//         name,
//         bio,
//         image,
//         onboarded: true,
//       },
//       // upsert combination of the words “update” and “insert.” In the context of relational databases,
//       // an upsert is a database operation that will update an existing row
//       // if a specified value already exists in a table, and insert a new row if the specified
//       // value doesn't already exist
//       { upsert: true }
//     );
//     if (path === "/profile/edit") {
//       // allows you to purge (delete) cached data on-demand for a specific path
//       // this useful for scenarios where you wanna to update your cached data
//       // without waiting for a revalidation period to expire
//       revalidatePath(path);
//     }
//     console.log("User has been updated successfully==========");
//   } catch (error: any) {
//     console.log(`Failed to create/update user => ${error.message}`);
//   }
// }

// export async function fetchUser(userId: string) {
//   // Post.find().populate('author')
//   // .populate('author') method, Mongoose automatically replaces the author field
//   //  in each post document with the actual user document referenced by the author field's _id.
//   //  This process is called "population."
//   // path: Specifies the field or path in the document that you want to populate. In your example,
//   // it's "communities", indicating that you want to populate the communities field in the document.

//   // model: Specifies the Mongoose model to use when populating the specified field.
//   // This is useful when you need to specify a different model than the one associated
//   // with the field in the schema.In your example, it's Community, indicating that you want to use
//   // the Community model to populate the communities field.
//   try {
//     await connectToDb();

//     return await User.findOne({ id: userId });
//     //   .populate({
//     //   path: "communities",
//     //   model: Community,
//     // });
//   } catch (error: any) {
//     throw new Error(`Failed to fetch User => ${error.message}`);
//   }
// }

// export async function fetchUserPosts(userId: string) {
//   try {
//     await connectToDb();
//     //find all threads authored by the user with the given userId
//     // TODO: populate community

//     const threads = await User.findOne({
//       id: userId,
//     }).populate({
//       path: "threads",
//       model: Thread,
//       populate: {
//         path: "children",
//         model: Thread,
//         populate: {
//           path: "author",
//           model: User,
//           select: "name image id",
//         },
//       },
//     });
//     return threads;
//   } catch (error: any) {
//     throw new Error(`Failed to fetch user posts => ${error.message}`);
//   }
// }

// export async function fetchUsers({
//   userId,
//   searchString = "",
//   pageNumber = 1,
//   pageSize = 20,
//   sortBy = "desc",
// }: {
//   userId: string;
//   searchString?: string;
//   pageNumber?: number;
//   pageSize?: number;
//   sortBy?: SortOrder;
// }) {
//   try {
//     await connectToDb();

//     const skipAmount = (pageNumber - 1) * pageSize;
//     // i mean case in sensitive
//     const regex = new RegExp(searchString, "i");

//     const query: FilterQuery<typeof User> = {
//       // $ne mean not equal the current id , cause we filter out our current user id
//       id: { $ne: userId },
//     };
//     if (searchString.trim() !== "") {
//       /*
//       The $or operator performs a logical OR operation on an array of one or more
//       <expressions> and selects the documents that satisfy at least one of the <expressions>.
//       */
//       query.$or = [
//         { username: { $regex: regex } },
//         { name: { $regex: regex } },
//       ];
//     }
//     const sortOptions = { createdAd: sortBy };

//     const userQuery = User.find(query)
//       .sort(sortOptions)
//       .skip(skipAmount)
//       .limit(pageSize);
//     // pass the quey cause we wanna the number of user including in the query
//     const totalUsersCount = await User.countDocuments(query);
//     const users = await userQuery.exec();
//     const isNext = totalUsersCount > skipAmount + users.length;
//     return { users, isNext };
//   } catch (error: any) {
//     throw new Error(`Failed to fetch users => ${error.message}`);
//   }
// }

// export async function getActivity(userId: string) {
//   try {
//     await connectToDb();
//     // find all threads created by the user
//     const userThreads = await Thread.find({ author: userId });

//     /*
//     -reduce method is a higher-order function in JavaScript used to transform an array into a single value
//     It takes a callback function and an initial value as parameters.
//      -collect all the child thread ids (replies) from 'children' field
//      -reduce is native javascript reduce function
//      -bellow will iterate over all thread and take the children of each one and concat them
//      in one single array and store in child thread ids
//     acc (accumulator): This parameter represents the accumulated result of the reduction.
//     userThread: This parameter represents the current element being processed in the array (userThreads).
//     */
//     const childThreadIds = userThreads.reduce(
//       (acc, userThread) => {
//         return acc.concat(userThread.children);
//       },
//       [
//         /* default value acc*/
//       ]
//     );
//     // final get access to all of the replies excluding the once created by the same user
//     // that is searching for this
//     // $in and sames name query operator
//     const replies = await Thread.find({
//       _id: { $in: childThreadIds },
//       author: { $ne: userId },
//     }).populate({
//       path: "author",
//       model: User,
//       select: "name image _id",
//     });
//     // the replies will have all replies on the all thread of the user without his reply for hem self
//     // and the info of author of this replies
//     return replies;
//   } catch (error: any) {
//     throw new Error(`Failed to fetch activity => ${error.message}`);
//   }
// }
