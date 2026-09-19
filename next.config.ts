import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lets phones on the same WiFi load the host/screen/play pages during
  // local playtests — otherwise Next's dev server silently blocks HMR
  // requests from any origin other than localhost, and the page hangs on
  // "טוען..." forever without ever throwing a visible error.
  allowedDevOrigins: ["10.100.102.11"],
};

export default nextConfig;
