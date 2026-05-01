"use client";

import { Navbar } from "./navbar";

// Rendered only inside the (with-nav) route group layout.
// Canvas and login pages are outside that group, so they never see this.
export const NavbarWrapper = () => <Navbar />;
