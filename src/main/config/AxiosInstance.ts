import axios from 'axios'

const AxiosInstance = axios.create({
  baseURL: (import.meta.env as any).VITE_BACKEND_KEY
})

export default AxiosInstance
