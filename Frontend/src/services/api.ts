import axios from "axios"
import { toast } from "@/hooks/use-toast"

// backend URL
const api = axios.create({
  baseURL: "http://127.0.0.1:8000", // default Uvicorn host/port
  headers: {
    "Content-Type": "application/json",
  },
})

// 🔐 Attach token for every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token")
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`
  }
  return config
})

// 🚨 Handle expired JWT (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // clear stale auth
      localStorage.removeItem("auth_token")
      localStorage.removeItem("user_data")

      toast({
        title: "Session Expired",
        description: "Please log in again to continue.",
        variant: "destructive",
      })

      // redirect to login
      window.location.href = "/login"
    }
    return Promise.reject(error)
  }
)

export default api
