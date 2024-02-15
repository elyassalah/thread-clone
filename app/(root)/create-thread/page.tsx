import PostThread from "@/components/forms/PostThread";
import { fetchUser } from "@/lib/actions/user.actions";
import { currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

async function Page() {
  const user = await currentUser();
  if (!user) {
    // also clerk will redirect auto if we are not logged in
    return null;
  }

  const userInfo = await fetchUser(user.id);
  // if onboarded = false redirect user to onboarding
  if (!userInfo?.onboarded) {
    // allow us to move all users that maybe switch their url manually
    // we going to bring them back to the onboarding if have not onboarded yet
    redirect("/onboarding");
  }
  return (
    <>
      <h1 className="head-text">Create Thread</h1>;
      <PostThread userId={userInfo._id.toString()} />
    </>
  );
}

export default Page;
