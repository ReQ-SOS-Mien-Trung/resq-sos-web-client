import api from "@/config/axios";
import { UserMeResponse } from "./type";

export async function getUserMe(): Promise<UserMeResponse> {
  const { data } = await api.get("/identity/user/me");
  return data;
}
