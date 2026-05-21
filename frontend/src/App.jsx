import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Login
from "./pages/auth/Login";

import Home
from "./pages/home/Home";

import ProtectedRoute
from "./components/common/ProtectedRoute/ProtectedRoute";

function App() {

  return (

    <BrowserRouter>

      <Routes>

        <Route
          path="/login"
          element={<Login />}
        />

        <Route

          path="/"

          element={

            <ProtectedRoute>

              <Home />

            </ProtectedRoute>

          }

        />

      </Routes>

    </BrowserRouter>

  );

}

export default App;