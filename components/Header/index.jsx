import { Button } from "@nextui-org/react";
import Image from "next/image";

const Header = () => {
  return (
    <div>
      <div
        className="relative w-full h-[300px] lp:h-screen bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/header.png')",          
        }}
      >
        <div className="absolute inset-0 w-1/3 lp:w-1/4 h-full backdrop-brightness-100 backdrop-saturate-0"></div>
        <div className="absolute inset-y-0 right-0 w-2/3 lp:w-3/4 h-full backdrop-brightness-150"></div>
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col lp:justify-center lp:items-start">
        <div className="mt-4 lp:absolute lp:bottom-20 lp:left-1/4 lp:ml-10 mr-3 max-w-none">
          <h1 className="text-black text-3xl tb:text-5xl lp:text-6xl font-bold lp:max-w-[1000px]">
            Website Design & Development
          </h1>
          <p className="text-black text-lg tb:text-2xl lp:text-3xl mt-2 lp:max-w-[800px]">
            Think your website is cutting-ege? Keep scrolling and see what real
            innovation looks like!
          </p>
          <div className="flex mt-4 space-x-4">
            <Button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
              Design
            </Button>
            <Button className="bg-transparent border border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-bold py-2 px-4 rounded">
              Develop
            </Button>
          </div>
        </div>
        <div className="hidden lp:block absolute bottom-10 right-10">
          <Image
            src={"/images/icons8-down-arrow-100.png"}
            width={30}
            height={30}
          />
        </div>
      </div>
    </div>
  );
};

export default Header;
