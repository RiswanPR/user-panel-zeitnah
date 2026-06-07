import {
  useEffect,
  useState,
} from "react";

function VideoWatermark({
  user,
}) {

  const [position,
    setPosition] =
    useState(0);

  const [time,
    setTime] =
    useState("");

  useEffect(() => {

    const move =
      setInterval(() => {

        setPosition(
          Math.floor(
            Math.random() * 4
          )
        );

      }, 10000);

    const clock =
      setInterval(() => {

        setTime(
          new Date()
            .toLocaleString()
        );

      }, 1000);

    return () => {

      clearInterval(
        move
      );

      clearInterval(
        clock
      );

    };

  }, []);

  const positions = [

    "top-8 left-8",

    "top-8 right-8",

    "bottom-8 left-8",

    "bottom-8 right-8",

  ];

  return (

    <div
      className={`
        absolute
        ${positions[position]}
        z-50
        pointer-events-none
        select-none
      `}
    >

      <div className="
        bg-black/30
        backdrop-blur-md
        px-4
        py-2
        rounded-xl
        text-white/80
        text-xs
        font-medium
      ">

        <div>
          {user?.name}
        </div>

        <div>
          {user?.email}
        </div>

        <div>
          {time}
        </div>

      </div>

    </div>

  );

}

export default VideoWatermark;