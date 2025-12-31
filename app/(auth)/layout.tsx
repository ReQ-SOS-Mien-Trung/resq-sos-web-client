import { ReactNode } from "react";

const AuthLayout = async ({ children }: { children: ReactNode }) => {
  return <section>{children}</section>;
};

export default AuthLayout;
