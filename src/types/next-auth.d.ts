import { type Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    email: string;
    fullName: string;
    role: Role;
    securityStamp: string;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      email: string;
      fullName: string;
      role: Role;
    };
    expires: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    email: string;
    fullName: string;
    role: Role;
    securityStamp: string;
  }
}
