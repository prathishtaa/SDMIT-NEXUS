import axios from "axios"

// backend URL
const api = axios.create({
  baseURL: "http://127.0.0.1:8000", // default Uvicorn host/port
  headers: {
    "Content-Type": "application/json",
  },
})
export default api