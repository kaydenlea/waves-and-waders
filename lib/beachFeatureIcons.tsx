import React from "react";

// Lucide React icons
import {
  BadgeCheck,
  DollarSign,
  Info,
  MapPin,
  ShieldCheck,
  Toilet,
  LifeBuoy,
} from "lucide-react";

// Game Icons - great for outdoor/beach
import {
  GiCampfire,
  GiBeachBucket,
  GiFishingBoat,
  GiSandsOfTime,
  GiBinoculars,
  GiWoodenPier,
  GiForestCamp,
  GiSailboat,
  GiWaveCrest,
  GiFishingHook,
  GiShower,
  GiWaterTower,
  GiTable,
  GiCaravan,
  GiLighthouse,
  GiStoneBlock,
  GiFootprint,
  GiWaterfall,
  GiSwamp,
  GiCliffCrossing,
  GiBeachBall,
  GiVolleyballBall,
  GiWaveSurfer,
  GiDivingDagger,
  GiSnorkel,
} from "react-icons/gi";

// Material Design
import {
  MdOutlinePark,
  MdRestaurant,
  MdLocalParking,
  MdAccessible,
  MdPublic,
  MdPets,
  MdBabyChangingStation,
} from "react-icons/md";

// Font Awesome
import {
  FaUmbrellaBeach,
  FaSwimmer,
  FaAnchor,
  FaShip,
  FaWalking,
  FaHorse,
  FaBiking,
  FaTrophy,
  FaTree,
} from "react-icons/fa";

export type BeachFeatureIcon = {
  icon: React.ReactNode;
  color: string;
  rank: number;
};

// Centralized icon/color map with beach-themed icons from react-icons
// Lower rank = higher priority (appears first)
export const BEACH_FEATURE_ICONS: Record<string, BeachFeatureIcon> = {
  // Top Priority - Most Important Amenities & Activities
  RESTROOMS: { icon: <Toilet size={16} />, color: "bg-yellow-100", rank: 1 },
  LIFEGUARD: { icon: <LifeBuoy size={16} />, color: "bg-red-100", rank: 2 },
  FISHING: { icon: <GiFishingHook size={16} />, color: "bg-blue-100", rank: 3 },
  SURFING: { icon: <GiWaveCrest size={16} />, color: "bg-blue-100", rank: 4 },
  SHOWERS: { icon: <GiShower size={16} />, color: "bg-cyan-100", rank: 5 },

  // High Priority Facilities & Activities
  PARKING: { icon: <MdLocalParking size={16} />, color: "bg-green-100", rank: 6 },
  SWIMMING: { icon: <FaSwimmer size={16} />, color: "bg-cyan-100", rank: 7 },

  // Beach Types - Important for beach selection
  SNDY_BEACH: { icon: <FaUmbrellaBeach size={16} />, color: "bg-orange-100", rank: 8 },
  DUNES: { icon: <GiSandsOfTime size={16} />, color: "bg-amber-100", rank: 12 },
  RKY_SHORE: { icon: <GiStoneBlock size={16} />, color: "bg-slate-200", rank: 9 },
  UPLAND_BCH: { icon: <FaTree size={16} />, color: "bg-emerald-100", rank: 11 },
  BAY_LGN_LK: { icon: <GiWaveCrest size={16} />, color: "bg-sky-100", rank: 10 },

  // Additional Activities
  DIVING: { icon: <GiDivingDagger size={16} />, color: "bg-cyan-100", rank: 13 },
  SNORKLNG: { icon: <GiSnorkel size={16} />, color: "bg-cyan-100", rank: 14 },
  WNDSRF_KIT: { icon: <GiWaveSurfer size={16} />, color: "bg-sky-100", rank: 15 },
  KAYAKING: { icon: <GiSailboat size={16} />, color: "bg-teal-100", rank: 16 },
  BOATING: { icon: <FaShip size={16} />, color: "bg-teal-100", rank: 17 },
  TIDEPOOL: { icon: <GiBeachBucket size={16} />, color: "bg-amber-100", rank: 18 },
  VOLLEYBALL: { icon: <GiVolleyballBall size={16} />, color: "bg-orange-100", rank: 19 },
  SPORT_FLDS: { icon: <FaTrophy size={16} />, color: "bg-orange-100", rank: 20 },
  PLAYGROUND: { icon: <GiBeachBall size={16} />, color: "bg-yellow-100", rank: 21 },

  // Additional Facilities
  DRINKWTR: { icon: <GiWaterTower size={16} />, color: "bg-blue-100", rank: 22 },
  FOOD: { icon: <MdRestaurant size={16} />, color: "bg-orange-100", rank: 23 },
  DOG_FRIEND: { icon: <MdPets size={16} />, color: "bg-pink-100", rank: 24 },
  DSABLDACSS: { icon: <MdAccessible size={16} />, color: "bg-indigo-100", rank: 25 },
  EZ4STROLLE: { icon: <MdBabyChangingStation size={16} />, color: "bg-violet-100", rank: 26 },
  VISTOR_CTR: { icon: <Info size={16} />, color: "bg-sky-100", rank: 27 },

  // Camping & Overnight (Rank 36-45)
  CAMPGROUND: { icon: <GiForestCamp size={16} />, color: "bg-lime-100", rank: 28 },
  RV_CMP: { icon: <GiCaravan size={16} />, color: "bg-lime-100", rank: 29 },
  FIREPITS: { icon: <GiCampfire size={16} />, color: "bg-rose-100", rank: 30 },
  PCNC_AREA: { icon: <GiTable size={16} />, color: "bg-amber-100", rank: 31 },

  // Trails & Paths
  TRAIL_OR_P: { icon: <GiFootprint size={16} />, color: "bg-emerald-100", rank: 32 },
  BIKE_PATH: { icon: <FaBiking size={16} />, color: "bg-teal-100", rank: 33 },
  WLDLFE_VWG: { icon: <GiBinoculars size={16} />, color: "bg-green-100", rank: 34 },

  // Less Common Beach Types
  STRM_CRDOR: { icon: <GiWaterfall size={16} />, color: "bg-cyan-100", rank: 35 },
  WETLAND: { icon: <GiSwamp size={16} />, color: "bg-green-100", rank: 36 },
  BLUFF: { icon: <GiCliffCrossing size={16} />, color: "bg-lime-100", rank: 37 },
  BOARDWLK: { icon: <FaWalking size={16} />, color: "bg-slate-100", rank: 38 },
  URBN_WFRNT: { icon: <MapPin size={16} />, color: "bg-gray-200", rank: 40 },
  STRS_BEACH: { icon: <GiFootprint size={16} />, color: "bg-slate-100", rank: 41 },
  PTH_BEACH: { icon: <GiFootprint size={16} />, color: "bg-slate-100", rank: 42 },
  BLFTP_TRLS: { icon: <FaWalking size={16} />, color: "bg-emerald-100", rank: 43 },
  BLFTP_PRK: { icon: <MdOutlinePark size={16} />, color: "bg-emerald-100", rank: 44 },
  EQUEST_TRL: { icon: <FaHorse size={16} />, color: "bg-amber-100", rank: 45 },

  // Special Features
  LIGHTHOUSE: { icon: <GiLighthouse size={16} />, color: "bg-purple-100", rank: 46 },
  PIER: { icon: <GiWoodenPier size={16} />, color: "bg-slate-100", rank: 47 },
  BT_FACILIT: { icon: <FaAnchor size={16} />, color: "bg-teal-100", rank: 48 },
  HAND_LAUNCH: { icon: <GiFishingBoat size={16} />, color: "bg-teal-100", rank: 49 },

  // Access & Fees - Less important for display
  O_PUBLIC: { icon: <MdPublic size={16} />, color: "bg-emerald-100", rank: 50 },
  FEE: { icon: <DollarSign size={16} />, color: "bg-amber-100", rank: 51 },
  RSTRCTNS: { icon: <ShieldCheck size={16} />, color: "bg-slate-200", rank: 52 },
};

// Default fallback icon
export const DEFAULT_FEATURE_ICON: BeachFeatureIcon = {
  icon: <BadgeCheck size={16} />,
  color: "bg-highlight-2",
  rank: 999,
};
