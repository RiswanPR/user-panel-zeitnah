import {
  NavLink,
} from "react-router-dom";

import {
  navItems,
} from "./navItems";

function Navbar() {

  return (

    <>

      {/* DESKTOP */}
      <div className="hidden lg:flex fixed left-0 top-0 h-screen w-72 bg-[#0b0b0b]/90 backdrop-blur-2xl border-r border-white/[0.06] z-50 flex-col px-5 py-6">

        {/* Glow */}
        <div className="absolute top-[-80px] left-[-80px] w-[220px] h-[220px] bg-cyan-500/10 blur-[100px] rounded-full" />

        <div className="absolute bottom-[-80px] right-[-80px] w-[220px] h-[220px] bg-violet-500/10 blur-[100px] rounded-full" />

        {/* Logo */}
        <div className="relative z-10 mb-12">

          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-transparent">
            ZEITNAH
          </h1>

          <p className="text-white/25 text-xs mt-1">
            Learning Platform
          </p>

        </div>

        {/* Links */}
        <div className="relative z-10 flex flex-col gap-2">

          {

            navItems.map(
              (item) => {

                const Icon =
                  item.icon;

                return (

                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({
                      isActive,
                    }) =>

                      `group flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 ${
                        isActive
                          ? "bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-400/20 shadow-lg shadow-cyan-500/5"
                          : "hover:bg-white/[0.03]"
                      }`
                    }
                  >

                    {({
                      isActive,
                    }) => (

                      <>

                        {/* ICON */}
                        <Icon
                          size={22}
                          className={`transition-all duration-300 ${
                            isActive
                              ? "text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                              : "text-violet-300 group-hover:text-cyan-300"
                          }`}
                        />

                        {/* TEXT */}
                        <span
                          className={`font-medium text-sm transition-all ${
                            isActive
                              ? "bg-gradient-to-r from-cyan-200 to-violet-300 bg-clip-text text-transparent"
                              : "text-white/60 group-hover:text-white"
                          }`}
                        >
                          {item.name}
                        </span>

                      </>

                    )}

                  </NavLink>

                );

              }
            )

          }

        </div>

      </div>

      {/* MOBILE / TABLET */}
      <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] bg-[#0b0b0b]/85 backdrop-blur-2xl border border-white/[0.06] rounded-3xl z-50 px-3 py-3 shadow-2xl shadow-black/50">

        <div className="flex justify-around items-center">

          {

            navItems.map(
              (item) => {

                const Icon =
                  item.icon;

                return (

                  <NavLink
                    key={item.path}
                    to={item.path}
                  >

                    {({
                      isActive,
                    }) => (

                      <div
                        className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 ${
                          isActive
                            ? "bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-400/20 shadow-lg shadow-cyan-500/10"
                            : "hover:bg-white/[0.03]"
                        }`}
                      >

                        <Icon
                          size={22}
                          className={`transition-all duration-300 ${
                            isActive
                              ? "text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.45)]"
                              : "text-violet-300"
                          }`}
                        />

                      </div>

                    )}

                  </NavLink>

                );

              }
            )

          }

        </div>

      </div>

    </>

  );

}

export default Navbar;