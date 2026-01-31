// app/fonts.ts
import localFont from "next/font/local";

export const sfUIDisplay = localFont({
  src: [
    {
      path: "../public/fonts/sf-ui-display-ultralight-58646b19bf205.otf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../public/fonts/sf-ui-display-thin-58646e9b26e8b.otf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../public/fonts/sf-ui-display-light-58646b33e0551.otf",
      weight: "300",
      style: "normal",
    },
    {
      // Dùng Light cho weight 400 vì không có file Regular
      path: "../public/fonts/sf-ui-display-light-58646b33e0551.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/sf-ui-display-medium-58646be638f96.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/sf-ui-display-semibold-58646eddcae92.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/sf-ui-display-bold-58646a511e3d9.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/sf-ui-display-heavy-586470160b9e5.otf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../public/fonts/sf-ui-display-black-58646a6b80d5a.otf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-sf-ui-display",
  display: "swap",
});
