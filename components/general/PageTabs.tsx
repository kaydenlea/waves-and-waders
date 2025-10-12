import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import SaveButton from "./SaveButton";

import { cn } from "@/lib/utils";
import FocusMapButton from "./FocusMapButton";

const PageTabs = ({
  beach,
  defaultPage,
  tabs,
  buttons = true,
}: {
  beach?: string;
  defaultPage: string;
  tabs: string[];
  buttons?: boolean;
}) => {
  return (
    <div className="mx-auto @min-3xl:absolute @min-3xl:right-0 flex gap-1 @min-sm:gap-2">
      {buttons && (
        <>
          <FocusMapButton beach={beach} />
          <SaveButton className="hidden @min-3xl:block" />
        </>
      )}
      <div className="text-sm @min-sm:text-base font-medium p-1.5 flex bg-highlight-3 rounded-full border border-border/20">
        <Link
          className={cn(
            "px-3 py-1 rounded-full capitalize",
            defaultPage === tabs[0]
              ? "bg-background dark:bg-highlight-5"
              : "hover:bg-background/50 dark:hover:bg-highlight-5/50"
          )}
          href={beach ? `/${beach}/overview` : "/beaches"}
        >
          {tabs[0]}
        </Link>
        <Link
          className={cn(
            "px-3 py-1 rounded-full capitalize",
            defaultPage === tabs[1]
              ? "bg-background dark:bg-highlight-5"
              : "hover:bg-background/50 dark:hover:bg-highlight-5/50"
          )}
          href={beach ? `/${beach}/forecast` : "/beaches"}
        >
          {tabs[1]}
        </Link>
      </div>
      {/* <Tabs defaultValue={defaultPage} className="">
        <TabsList className="text-sm @min-sm:text-base">
          <TabsTrigger value="overview">
            <Link className="p-3" href={`/${beach}/overview#content`}>
              Overview
            </Link>
          </TabsTrigger>
          <TabsTrigger value="forecast">
            <Link className="p-3" href={`/${beach}/forecast#content`}>
              Forecast
            </Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview"></TabsContent>
          <TabsContent value="forecast"></TabsContent>
      </Tabs> */}
      {buttons && <SaveButton className="@min-3xl:hidden" />}
    </div>
  );
};

export default PageTabs;
