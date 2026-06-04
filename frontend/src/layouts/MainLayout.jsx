import Navbar
from "../components/navbar/Navbar";

function MainLayout({
  children,
}) {

  return (

    <div className="bg-[#0a0a0a] min-h-screen">

      <Navbar />

      {/* CONTENT */}
      <div className="pb-28 lg:ml-72 lg:pb-0">

        {children}

      </div>

    </div>

  );

}

export default MainLayout;
