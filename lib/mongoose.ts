import mongoose from "mongoose";


let isConnected = false;
export const connectToDb = async () => {
  // to prevent unknown field queries
  mongoose.set("strictQuery", true);
  // if (!process.env.MONGODB_URL) console.log("Url of DataBase not found");
  if (isConnected) {
    return console.log("Already connected to DataBase");
  }
  // we get fre instance on cluster from atlas
  try {
    await mongoose.connect(process.env.MONGODB_URL!);
    isConnected = true;
    console.log("Connected to DataBase");
  } catch (error) {
    console.log(`Failed connect to DataBase => ${error}`);
  }
};
