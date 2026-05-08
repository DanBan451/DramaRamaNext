/**
 * Match NextUI Navbar maxWidth="2xl": inner wrapper is max-w-[1536px] + px-6,
 * centered in the viewport (nav uses flex justify-center on the outer bar).
 */
export default function CourseLayout({ children }) {
  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-[1536px] px-6 box-border min-w-0">
        {children}
      </div>
    </div>
  );
}
