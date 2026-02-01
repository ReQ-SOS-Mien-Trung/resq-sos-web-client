import axios, { AxiosInstance, AxiosResponse } from "axios";
import { useAuthStore } from "@/stores/auth.store";

const API_URL = process.env.NEXT_PUBLIC_BASE_URL;

// Khởi tạo 1 Axios instance duy nhất cho toàn app
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    // Lấy token từ Zustand store
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    return Promise.reject(error);
  },
);

export default axiosInstance;
