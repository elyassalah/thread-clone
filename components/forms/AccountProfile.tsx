"use client";
// there is some error that hydration failed because the initial ui does not match what was render
// on the server , its has more reason can find it in the docs of next ,some reason hidden
// and you never suspect is
// browser extension that make this error
// cause this extension that user download it in his browser make error cause
// we do not modifying the html
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
// bello library that simplify the manipulate and work with form
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserValidation } from "@/lib/validations/user";
// import zod here to define the type of it for values in onSubmit
import { z } from "zod";
import { Button } from "../ui/button";
import Image from "next/image";
import { ChangeEvent, useState } from "react";
import { Textarea } from "../ui/textarea";
import { isBase64Image } from "@/lib/utils";
import { useUploadThing } from "@/lib/uploadthing";
import { updateUser } from "@/lib/actions/user.actions";
import { usePathname, useRouter } from "next/navigation";

interface Props {
  user: {
    id: string;
    objectId: string;
    username: string;
    name: string;
    bio: string;
    image: string;
  };
  btnTitle: string;
}

const AccountProfile = ({ user, btnTitle }: Props) => {
  const [files, setFiles] = useState<File[]>([]);
  const { startUpload } = useUploadThing("media");
  const router = useRouter();
  const pathname = usePathname();
  // the form data that will be passed into bellow form
  const form = useForm({
    // resolver is another package that simplify the work with forms is going to come in handy
    // and that package is called Zod
    // and zod is a typescript first schema validation with static types
    // that allow us to really easily create different schemas for the fields in the forms
    resolver: zodResolver(UserValidation),
    defaultValues: {
      // when we implement edit profile , this data will pull from clerk
      // we will take an error to protect us from next that talk there is image that
      // has to render that coming from clerk so we need to allow it in next.config.js
      // allow the img.clerk.com to be rendered
      profile_photo: user?.image || "",
      name: user?.name || "",
      username: user?.username || "",
      bio: user?.bio || "",
    },
  });
  // e the event happen and the fieldChange is a callBack function that accept the value changed
  // and not return anything
  const handleImage = (
    // declare the type of the event
    e: ChangeEvent<HTMLInputElement>,
    fieldChange: (value: string) => void
  ) => {
    // to prevent the browser to reload
    e.preventDefault();
    // crate a variable from FileReader we call it as function to can read the file
    // which is used to read the contents of files asynchronously.
    const fileReader = new FileReader();

    // to check if the files not null (e.target.files)
    if (e.target.files && e.target.files.length > 0) {
      // if the file exist in e so save it in variable file
      // and we user [0] cause user can load more than one and we need just one from the list of selected files
      const file = e.target.files[0];

      // set the file as array
      // sets it as the state of the component using the setFiles function.
      // This is presumably used to keep track of the selected files.
      setFiles(Array.from(e.target.files));
      // if the file type not includes image so exit out the function with return
      if (!file.type.includes("image")) return;
      // bellow sets up an event handler that will be called when the file reading operation is complete.
      // Inside the event handler, event.target?.result contains the file data as a data URL.
      fileReader.onload = async (event) => {
        // for read the url of file
        const imageDataUrl = event.target?.result?.toString() || "";

        // we call fieldChange which allow us to update that by passing the imageDataUrl
        // we doing this cause we using the react hook form and thats how we update the field
        // This is typically used to update the state of a form field with the selected image.
        fieldChange(imageDataUrl);
      };
      // bellow should allows us to change the image
      // starts the reading operation on the selected file. It reads the contents of the
      // specified Blob or File, once the operation is finished, the loadend event
      // is triggered and its result attribute contains the data as a data URL representing
      // the file's data as a base64 encoded string.
      fileReader.readAsDataURL(file);
    }
  };
  // the type of the onSubmit is the UserValidation schema cause we are doing to submit
  // whatever has to be within the specific object in UserValidation
  const onSubmit = async (values: z.infer<typeof UserValidation>) => {
    // onSubmit is going to reupload the new image and update the user in db
    // first we going to get the value from our profile_photo
    // usually the value from image called blob
    const blob = values.profile_photo;
    // above we are setting it use react hook from in setFiles in handleImage
    // and also fieldChange
    const hasImageChanged = isBase64Image(blob);
    if (hasImageChanged) {
      // use startUpload and send the files which we created on react hook useState
      // and we are add to it in handleImage so it has the url of image selected
      const imgRes = await startUpload(files);

      if (imgRes && imgRes[0].url) {
        // to update the profile_photo
        // with react hook it auto update the state just when mutate the values
        // without care about useState and setting the state using setter function
        values.profile_photo = imgRes[0].url;
      }
    }
    // the order of params should be the same order in
    // way the updateUser receive them so the best way and does not mater which order we send
    // make it object and use the name of the key in updateUser
    // also make edit in updateUser params
    await updateUser({
      username: values.username,
      // user.id coming from clerk
      userId: user.id,
      bio: values.bio,
      image: values.profile_photo,
      name: values.name,
      path: pathname,
    });
    if (pathname === "/profile/edit") {
      router.back();
    } else {
      // will be in onBoarding so push to home
      router.push("/");
    }
  };
  return (
    // ...form to spread all data into form
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col justify-start  gap-10"
      >
        <FormField
          control={form.control}
          // this the name of field and we use field.onChange
          // in input in this field so it will be updated auto in react hook form in handleImage
          name="profile_photo"
          render={({ field }) => (
            <FormItem className="flex items-center gap-4">
              <FormLabel className="account-form_image-label ">
                {field.value ? (
                  <Image
                    src={field.value}
                    alt="profile photo"
                    width={96}
                    height={96}
                    // this priority loading this prop by nextJs
                    priority
                    className="rounded-full object-contain"
                  />
                ) : (
                  <Image
                    src="/assets/profile.svg"
                    alt="profile photo"
                    width={24}
                    height={24}
                    // does not hav priority loading cause its from assets
                    className="object-contain rounded-full"
                  />
                )}
              </FormLabel>
              <FormControl className="flex-1 text-body-semibold text-gray-200">
                <Input
                  type="file"
                  // accept image of all types
                  accept="image/*"
                  placeholder="Upload a photo"
                  className="account-form_image-input"
                  // on change pass the event and the field onchange
                  onChange={(e) => handleImage(e, field.onChange)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-3 w-full ">
              <FormLabel className="text-base-semibold text-light-2">
                Name
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  className="account-form_input no-focus"
                  // no need the onChange cause we can to spread the default field prop
                  // and it will take the name cause the FormField name is "name"
                  {...field}
                />
              </FormControl>
              {/* for error message */}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-3 w-full ">
              <FormLabel className="text-base-semibold text-light-2">
                Username
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  className="account-form_input no-focus"
                  // no need the onChange cause we can to spread the default field prop
                  // and it will take the username cause the FormField name is "username"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-3 w-full ">
              <FormLabel className="text-base-semibold text-light-2">
                Bio
              </FormLabel>
              <FormControl>
                <Textarea
                  rows={10}
                  className="account-form_input no-focus"
                  // no need the onChange cause we can to spread the default field prop
                  // and it will take the bio cause the FormField name is "bio"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="bg-primary-500"
        >
          Submit
        </Button>
      </form>
    </Form>
  );
};

export default AccountProfile;
