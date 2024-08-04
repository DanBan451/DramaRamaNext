"use client";

import { Link } from "@nextui-org/link";
import { Image } from "@nextui-org/react";
import React from "react";
import { Snippet } from "@nextui-org/snippet";
import { Code } from "@nextui-org/code";
import { button as buttonStyles } from "@nextui-org/theme";

import { siteConfig } from "@/config/site";
import { title, subtitle } from "@/components/primitives";
import { GithubIcon } from "@/components/icons";

import { faCoffee } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import Device from "@/components/Device/Device";

export default function Home() {
  return (
    <Device>
      {({ isMobile }) => {
        return isMobile ? (
          <div>
            <div className={"h-[80vh] w-[100vw]"}>
              <Image
                src="../images/header.png"
                className="w-[100%] h-[100%]"
                objectfit={"cover"}
              />
              <div className={"w-[30%] h-[100%] opacity-5 absolute bg-black"} />
            </div>
            <h1 className="1rem">Website Design & Development</h1>
            <p className="0.5rem">
              Think your website is cutting-ege? Keep scrolling and see what
              real innovation looks like!
            </p>
            <div className={"flex flex-row mt-5"}>
              <Link className={"py-3 px-5 bg-red-500 text-white"}>Design</Link>
              <Link className={"py-3 px-5 bg-red-500 text-white"}>
                Develop
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className={"h-[100vh] w-[100vw]"}>
              <Image
                src="../images/header.png"
                className="w-[100%] h-[100%]"
                objectfit={"cover"}
              />
              <div className={"w-[30%] h-[100%] opacity-5 absolute bg-black"} />
            </div>
            <div>
              <h1 className="1rem">Website Design & Development</h1>
              <p className="0.5rem">
                Think your website is cutting-ege? Keep scrolling and see what
                real innovation looks like!
              </p>
              <div className={"flex flex-row mt-5 absolute"}>
                <Link className={"py-3 px-5 bg-red-500 text-white"}>Design</Link>
                <Link className={"py-3 px-5 bg-red-500 text-white"}>
                  Develop
                </Link>
              </div>
            </div>
          </div>
        );

        // <FontAwesomeIcon icon={faCoffee} />
      }}
    </Device>

    // <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
    //   <div className="inline-block max-w-lg text-center justify-center">
    //     <h1 className={title()}>Make&nbsp;</h1>
    //     <h1 className={title({ color: "violet" })}>beautiful&nbsp;</h1>
    //     <br />
    //     <h1 className={title()}>
    //       websites regardless of your design experience.
    //     </h1>
    //     <h2 className={subtitle({ class: "mt-4" })}>
    //       Beautiful, fast and modern React UI library.
    //     </h2>
    //   </div>

    //   <div className="flex gap-3">
    //     <Link
    //       isExternal
    //       className={buttonStyles({
    //         color: "primary",
    //         radius: "full",
    //         variant: "shadow",
    //       })}
    //       href={siteConfig.links.docs}
    //     >
    //       Documentation
    //     </Link>
    //     <Link
    //       isExternal
    //       className={buttonStyles({ variant: "bordered", radius: "full" })}
    //       href={siteConfig.links.github}
    //     >
    //       <GithubIcon size={20} />
    //       GitHub
    //     </Link>
    //   </div>

    //   <div className="mt-8">
    //     <Snippet hideCopyButton hideSymbol variant="bordered">
    //       <span>
    //         Get started by editing <Code color="primary">app/page.tsx</Code>
    //       </span>
    //     </Snippet>
    //   </div>
    // </section>
  );
}
