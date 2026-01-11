import nearbyLight from "@/public/demo_pictures/nearby_beaches_light.png";
import nearbyDark from "@/public/demo_pictures/nearby_beaches_dark.png";
import savedLight from "@/public/demo_pictures/saved_beaches_light.png";
import savedDark from "@/public/demo_pictures/saved_beaches_dark.png";
import overviewLight from "@/public/demo_pictures/overview_light_2.png";
import overviewDark from "@/public/demo_pictures/overview_dark_2.png";
import overviewNoMapLight from "@/public/demo_pictures/overview_light_3.png";
import overviewNoMapDark from "@/public/demo_pictures/overview_dark_3.png";
import editLight from "@/public/demo_pictures/personalize_light_1.png";
import editDark from "@/public/demo_pictures/personalize_dark_1.png";
import layout1Light from "@/public/demo_pictures/personalize_light_2.png";
import Layout1Dark from "@/public/demo_pictures/personalize_dark_2.png";
import layout2Light from "@/public/demo_pictures/personalize_light_3.png";
import Layout2Dark from "@/public/demo_pictures/personalize_dark_3.png";

export type PreviewImage = {
  light: typeof nearbyLight;
  dark: typeof nearbyDark;
};

export type PreviewCard = {
  key: string;
  title: string;
  description: string;
  image: PreviewImage;
};

export const PERSONALIZE_PREVIEW_CARDS: PreviewCard[] = [
  {
    key: "edit",
    title: "Edit dashboard",
    description: "Edit your widget layout.",
    image: { light: editLight, dark: editDark },
  },
  {
    key: "layout 1",
    title: "Compact widgets",
    description: "Set your layout how you like.",
    image: { light: layout1Light, dark: Layout1Dark },
  },
  {
    key: "layout 2",
    title: "Mixed widgets",
    description: "Make your forecasts your own.",
    image: { light: layout2Light, dark: Layout2Dark },
  },
];

export const FORECAST_PREVIEW_CARDS: PreviewCard[] = [
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
  {
    key: "expanded overview",
    title: "Expanded overview",
    description: "View your forecast with or without a map",
    image: { light: overviewNoMapLight, dark: overviewNoMapDark },
  },
];
