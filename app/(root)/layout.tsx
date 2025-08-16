import React from "react";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <h4>Shared layout for root pages</h4>
      <div>{children}</div>
    </div>
  );
};

export default Layout;
