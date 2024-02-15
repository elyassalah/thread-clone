// this is a service that simpler the work with upload things to our server 
// its work like S3 but more simpler
import { generateReactHelpers } from "@uploadthing/react";

import type { OurFileRouter } from "@/app/api/uploadthing/core";
// we should add file at api route so we have to have the backend for image upload
export const { useUploadThing, uploadFiles } =
  generateReactHelpers<OurFileRouter>();
