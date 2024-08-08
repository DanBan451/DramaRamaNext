"use client";

import React from "react";
import Header from "../components/Header/index";
import Image from "next/image";
import { Button } from "@nextui-org/button";

export default function Home() {
  return (
    <div>
      <Header />

      <div className="flex flex-col max-w-[1536px] mx-auto p-4 sm:p-8 md:p-12 lg:p-16">
        <div className="flex flex-col sm:flex-row justify-between w-full space-y-8 sm:space-y-0 my-8 sm:space-x-8">
          {["Design", "Develop"].map((item, key) => (
            <div
              key={item}
              className="flex flex-col sm:items-start max-w-[600px] w-full"
            >
              <Image
                src={`/images/image${key + 1}.png`}
                alt={`Image ${key}`}
                width={600}
                height={400}
                className="w-full h-auto"
              />
              <h2 className="mt-4 text-2xl font-bold text-black">{item}</h2>
              <p className="mt-2 text-black lp:text-lg">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                Pellentesque vel enim a elit viverra elementum. Suspendisse
                vehicula massa a nisl efficitur, in ultricies dui efficitur.
              </p>
              <Button
                className={`mt-4 px-4 py-2 w-fit bg-red-500 text-white rounded`}
              >
                {/* <Button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"> */}
                {item}
              </Button>
            </div>
          ))}
        </div>
      </div>
      <div className="relative-container relative w-full pt-5 tb:pt-10 tb:p-12 h-[800px] bg-cover bg-center bg-no-repeat dp:h-screen">
        <div className="relative mx-auto max-w-[1408px] h-full flex flex-col sm:space-x-8 lp:justify-center">
          <div className="flex flex-col tb:flex-row tb:justify-between tb:space-x-8">
            {/* First Item */}
            <div className="flex-1 max-w-[600px] bg-transparent p-4 sm:p-0 text-black flex flex-col tb:order-2 dp:gap-5">
              <h1 className="text-2xl font-bold mb-4 lp:text-4xl">
                The Mask Process
              </h1>
              <p className="mb-4 lp:text-lg">
                Whenever we are creating your design, we are the ultimate
                Devil’s Advocate — no idea or norms are held sacred. We perform
                thorough research of your competitors, educating ourselves as to
                what they are doing right and wrong. With sufficient
                information, we utilize mental-models fueled with A.I. into
                “masking” ourselves into various competitive scenarios. We then
                create user-persona’s matching your branding and voice. With
                those persona’s, we craft a beautiful and attention catching
                design.
              </p>
              <Button
                className={`mt-4 px-4 py-2 w-fit bg-red-500 text-white rounded`}
              >
                Get Started
              </Button>
            </div>

            {/* Second Item */}
            <div className="flex-1 max-w-[600px] bg-transparent p-4 sm:p-0 tb:order-1"></div>
          </div>
        </div>
        <style jsx>{`
          .relative-container {
            background-image: url("/images/mask-background.png");
          }

          @media (max-width: 640px) {
            .relative-container {
              background-image: url("/images/mask-background-flip.png");
            }
          }

          @media (min-width: 641px) {
            .relative-container {
              background-image: url("/images/mask-background.png");
            }
          }
        `}</style>
      </div>

      <div className="flex flex-col max-w-[1408px] mx-auto p-4 lp:p-8 md:p-12 lg:p-16 dp:p-0 lp:w-screen lp:h-screen lp:justify-center">
        <div className="flex flex-col lp:flex-row lp:flex-row-reverse justify-between w-full space-y-8 lp:space-y-0 my-8 lp:space-x-8 dp:space-x-0">
          <div className="flex flex-col lp:items-start max-w-[500px] lp:max-w-[600px] w-full mx-auto lp:mx-0">
            <Image
              src={`/images/path-not-followed.png`}
              alt={`Chess peice`}
              width={600}
              height={400}
              className="w-full h-full"
            />
          </div>

          <div className="flex flex-col lp:items-start max-w-[500px] lp:max-w-[600px] w-full mx-auto lp:gap-7">
            <div>
              <h2 className="tb:mt-4 text-2xl font-bold text-black lp:text-4xl">
                Path Not Followed
              </h2>
              <p className="mt-2 text-black lp:text-lg">
                We are not in the business of cookie-cutter solutions. Every
                business is unique with its own special Branding & Voice. What
                sets us apart?
              </p>
            </div>
            <div className={"flex flex-col gap-3 my-5 dp:gap-5 lp:text-lg"}>
              <div className={"flex flex-row text-black gap-3"}>
                <Image
                  src={"/images/chevron-right.png"}
                  height={30}
                  width={30}
                  className="h-[20px] w-[20px] tb:h-[30px] tb:w-[30px] my-auto"
                />
                <span>We bring-in powerful Mental-Models coupled with A.I</span>
              </div>
              <div className={"flex flex-row text-black gap-3"}>
                <Image
                  src={"/images/chevron-right.png"}
                  height={30}
                  width={30}
                  className="h-[20px] w-[20px] tb:h-[30px] tb:w-[30px] my-auto"
                />
                <span>Our special mask process</span>
              </div>
              <div className={"flex flex-row text-black gap-3"}>
                <Image
                  src={"/images/chevron-right.png"}
                  height={30}
                  width={30}
                  className="h-[20px] w-[20px] tb:h-[30px] tb:w-[30px] my-auto"
                />
                <span>Ultra-transparency & elite education</span>
              </div>
            </div>
            <div className="flex mt-4 space-x-4">
              <Button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                Learn More
              </Button>
              <Button className="bg-transparent border border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-bold py-2 px-4 rounded">
                Contact Us
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div
        className="w-full flex flex-col mx-auto p-4 lp:p-8 md:p-12 lg:p-16 dp:p-0 lp:w-screen lp:h-screen lp:justify-center bg-slate-900 bg-opacity-50"
        style={{
          backgroundImage: 'url("/images/background-daniel.png")',
          backgroundBlendMode: "multiply",
        }}
      >
        <div className="mx-auto max-w-[1408px] flex flex-col lp:flex-row justify-between w-full space-y-8 lp:space-y-0 my-8 lp:space-x-8 dp:space-x-0">
          <div className="flex flex-col lp:items-start max-w-[500px] lp:max-w-[600px] w-full mx-auto lp:mx-0">
            <Image
              src={`/images/me.jpg`}
              alt={`Chess peice`}
              width={600}
              height={400}
              className="w-full h-full"
              color="none"
              style={{ filter: "grayscale(100%)", boxShadow: '30px 30px 60px rgba(173, 216, 255, 0.5)' }}
            />
            <h2 className="tb:mt-4 text-2xl text-white lp:text-4xl z-10">
              Daniel Dobrovolskiy
            </h2>
          </div>

          <div className="flex flex-col lp:items-start max-w-[500px] lp:max-w-[600px] w-full mx-auto lp:gap-7 text-white">
            <h2 className="tb:mt-4 text-2xl font-bold lp:text-4xl">
              Who I Am
            </h2>
            <p className="mt-2 lp:text-lg">
              A professional software engineer with a passion for
              solving-puzzles, thinking-outside of the box, and challenging
              design norms. His hobbies are none of your business — literally.
              If you’re not convinced he is qualified for the job no idea why
              you’re reading this right now. Whenever we are creating your
              design, we are the ultimate Devil’s Advocate — no idea or norms
              are held sacred.
            </p>
            <Button
              className={`mt-4 px-4 py-2 w-fit bg-red-500 text-white rounded`}
            >
              Wanna change your life?
            </Button>
          </div>
        </div>
      </div>
      <div>
      <p className="mt-2 lp:text-lg text-white bg-black mt-0 py-3 text-center">
        DramaRama Copyright @ 2024
      </p>
      </div>

      {/* <Header2 /> */}

      {/* <DoubleLayout />       */}

      {/* <div>
        <div className="container mx-auto p-4 max-w-[1536px]">
          <div className="flex flex-col mb:flex-row gap-16 mb:gap-8 pt-8 bg-gray-300">
            <div className="flex-1 bg-red-400">
              <Image
                src="/images/image1.png"
                alt="Image 1"
                className="w-[100%] h-auto mb-4 lp:mb-10 transition-transform duration-300 hover:scale-105 rounded-none"
              />
              <h2 className="text-2xl lp:text-3xl text-black mb-4">
                Website Design
              </h2>
              <p className="text-base lp:text-xl text-black mt-2 mb-4 max-w-[661px]">
                This is the paragraph text for the first component. It should be
                responsive and adapt to different screen sizes. This is the
                paragraph text for the first component. It should be responsive
                and adapt to different screen sizes.
              </p>
              <Button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                Design
              </Button>
            </div>
            <div className="flex-1 bg-blue-200">
              <Image
                src="/images/image2.png"
                alt="Image 2"
                className="w-[100%] h-auto mb-4 lp:mb-10 transition-transform duration-300 hover:scale-105 rounded-none dp:ml-auto"
              />
              <h2 className="text-2xl lp:text-3xl text-black mb-4 dp:ml-auto">
                Website Development
              </h2>
              <p className="text-base lp:text-xl text-black mt-2 mb-4  max-w-[661px] dp:ml-auto">
                This is the paragraph text for the first component. It should be
                responsive and adapt to different screen sizes. This is the
                paragraph text for the first component. It should be responsive
                and adapt to different screen sizes.
              </p>
              <Button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                Develop
              </Button>
            </div>
          </div>
        </div>
        <div className="relative w-full h-screen bg-gray-100 dp:bg-transparent">
          <div className="absolute inset-0 bg-gray-100 tb:hidden"></div>          
          <div className="absolute inset-0 hidden tb:block dp:hidden">
            <Image
              src="/images/mask-background-flip.png"
              alt="Background Image Tablet"
              layout="fill"
              objectFit="cover"
            />
          </div>
          <div className="absolute inset-0 hidden dp:block">
            <Image
              src="/images/mask-background.png"
              alt="Background Image Desktop"
              layout="fill"
              objectFit="cover"
            />
          </div>
          <div className="relative z-10 flex flex-col justify-center items-center h-full px-4 py-16 tb:items-start tb:justify-start tb:max-w-2xl tb:mt-16 tb:px-8 dp:max-w-1/3 dp:ml-auto dp:px-16">
            <h1 className="text-2xl tb:text-4xl dp:text-5xl text-black mb-4">
              The Mask Process
            </h1>
            <p className="text-base tb:text-lg dp:text-xl text-black mb-4">
              You are a Frontend NextUI/Tailwind developer. Your task is to
              build a responsive header (fluid from mobile to desktop devices).
              Starting from mobile (mb in config), there is the header image
              taking up the full width of the screen and the height being auto
              (whatever the height of the image is). Below that image we have
              the header content: an h1 (the heading), a sub-heading, and 2
              buttons side by side. All the text is black. The buttons are red.
              There are two divs that rest on top of the image. The first div,
              taking 30% of the width of the image has backgrop of black and
              white. The second div has a backdrop that makes the image more
              brighter. As we get to tablet size (tb in config), the text
              becomes larger. And then when we get to laptop size (lp in
              config).
            </p>
            <Link href="/somepage">
              <a className="px-4 py-2 bg-red-500 text-white rounded">
                Get Started
              </a>
            </Link>
          </div>
        </div>
      </div> */}
    </div>
  );
}
