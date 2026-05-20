import { useEffect } from "react";
import api from "./services/api";

function App() {

  useEffect(() => {

    api.get("/auth")
      .then((res) => {
        console.log(res.data);
      });

  }, []);

  return (
    <div>
      Frontend Connected
    </div>
  );
}

export default App;