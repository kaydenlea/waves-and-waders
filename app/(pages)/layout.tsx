const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <h4>Shared layout for forecast and overview pages</h4>
      <div>{children}</div>
    </div>
  );
};

export default Layout;
