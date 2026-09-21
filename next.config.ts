import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lets phones on the same WiFi load the host/screen/play pages during
  // local playtests — otherwise Next's dev server silently blocks HMR
  // requests from any origin other than localhost, and the page hangs on
  // "טוען..." forever without ever throwing a visible error.
  // Kept as whole private ranges, not one IP: the laptop's DHCP address
  // changes between networks, and a stale literal here fails exactly that
  // silent way. Dev server only — `next start` ignores this.
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.*.*.*"],
};

export default nextConfig;
