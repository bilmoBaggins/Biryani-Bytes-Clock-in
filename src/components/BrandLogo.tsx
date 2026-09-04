import { Image } from "react-native";

type BrandLogoProps = {
  width?: number;
};

export default function BrandLogo({ width = 270 }: BrandLogoProps) {
  return (
    <Image
      source={require("../../assets/biryani-bytes-logo.jpeg")}
      style={{ width, height: width }}
      resizeMode="contain"
      accessibilityLabel="Biryani Bytes logo"
    />
  );
}