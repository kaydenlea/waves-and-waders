import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Surf Weekly Forecast | Waves and Waders",
  description: "Check the weekly surf conditions of your local beaches",
};

const Page = ({ params }: { params: { beach: string } }) => {
  // const { beach } = params;
  return <div>Forecast Page</div>;
};

export default Page;
