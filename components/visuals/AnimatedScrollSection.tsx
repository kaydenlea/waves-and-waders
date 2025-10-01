import Carousel from "./Carousel";
import InfiniteScroll from "./InfiniteScroll";

const items = [
  { content: "Text Item 1" },
  { content: <p>Paragraph Item 2</p> },
  { content: "Text Item 3" },
  { content: <p>Paragraph Item 4</p> },
  { content: "Text Item 5" },
  { content: <p>Paragraph Item 6</p> },
  { content: "Text Item 7" },
  { content: <p>Paragraph Item 8</p> },
  { content: "Text Item 9" },
  { content: <p>Paragraph Item 10</p> },
  { content: "Text Item 11" },
  { content: <p>Paragraph Item 12</p> },
  { content: "Text Item 13" },
  { content: <p>Paragraph Item 14</p> },
];

const AnimatedScrollSection = () => {
  return (
    // <InfiniteScroll
    //   items={items}
    //   isTilted
    //   tiltDirection="right"
    //   autoplay
    //   autoplaySpeed={2}
    //   autoplayDirection="up"
    //   pauseOnHover={false}
    // />
    <Carousel
      baseWidth={650}
      autoplay
      autoplayDelay={4000}
      pauseOnHover={false}
      loop
      round={false}
    />
    // <InfiniteScroll
    //   items={items}
    //   isTilted={true}
    //   tiltDirection="left"
    //   autoplay={true}
    //   autoplaySpeed={0.1}
    //   autoplayDirection="down"
    //   pauseOnHover={true}
    // />
  );
};
export default AnimatedScrollSection;
