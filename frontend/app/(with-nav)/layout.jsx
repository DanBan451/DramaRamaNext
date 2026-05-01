import { NavbarWrapper } from "@/components/NavbarWrapper";

export default function WithNavLayout({ children }) {
  return (
    <>
      <NavbarWrapper />
      {children}
    </>
  );
}
