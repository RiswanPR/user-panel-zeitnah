import ReactDOM from "react-dom/client";

import App from "./App";

import {
  AuthProvider,
} from "./context/AuthContext";

// Mount the React app and wrap it with auth state for protected routes.
ReactDOM.createRoot(
  document.getElementById("root")
).render(

  <AuthProvider>

    <App />

  </AuthProvider>

);
