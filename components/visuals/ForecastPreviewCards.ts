import nearbyLight from "@/public/demo_pictures/nearby_beaches_light.png";
import nearbyDark from "@/public/demo_pictures/nearby_beaches_dark.png";
import savedLight from "@/public/demo_pictures/saved_beaches_light.png";
import savedDark from "@/public/demo_pictures/saved_beaches_dark.png";
import overviewLight from "@/public/demo_pictures/overview_light.png";
import overviewDark from "@/public/demo_pictures/overview_dark.png";

export type ForecastPreviewImage = {
  light: typeof nearbyLight;
  dark: typeof nearbyDark;
};

export type ForecastPreviewCard = {
  key: string;
  title: string;
  description: string;
  image: ForecastPreviewImage;
};

export const FORECAST_PREVIEW_CARDS: ForecastPreviewCard[] = [
  {
    key: "nearby",
    title: "Nearby beaches",
    description: "Discover the right spot fast.",
    image: { light: nearbyLight, dark: nearbyDark },
  },
  {
    key: "saved",
    title: "Saved beaches",
    description: "Jump straight to saved spots.",
    image: { light: savedLight, dark: savedDark },
  },
  {
    key: "overview",
    title: "At-a-glance overview",
    description: "Scan conditions, time, and direction in seconds.",
    image: { light: overviewLight, dark: overviewDark },
  },
];

