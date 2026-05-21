import { CommunitySpotlightSlideshow } from "@/components/home/community-spotlight-slideshow";
import { getCommunitySpotlightSlides } from "@/lib/home/community-spotlight";

export async function HomeSpotlightSection() {
  const slides = await getCommunitySpotlightSlides();
  return <CommunitySpotlightSlideshow slides={slides} />;
}
