import axios from "axios";

const apiUrl = "https://gainschatapi.prathamsnehi.com";

const api = axios.create({
  baseURL: apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
