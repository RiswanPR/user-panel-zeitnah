import Navbar
from "../components/navbar/Navbar";

function MainLayout({
  children,
}) {

  return (

    <div className="bg-[#0a0a0a] min-h-screen">

      <Navbar />

      {/* CONTENT */}
      <div className="lg:ml-64 pb-20 lg:pb-0">

        {children}

      </div>

    </div>

  );

}

export default MainLayout;