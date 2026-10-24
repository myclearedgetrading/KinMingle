import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Papis",
    short_name: "Papis",
    description: "A private room for family and friends",
    start_url: "/home",
    display: "standalone",
    background_color: "#f3eee6",
    theme_color: "#1c1915",
  };
}
