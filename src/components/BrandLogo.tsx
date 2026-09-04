import Svg, { Ellipse, G, Path, Rect, Text as SvgText } from "react-native-svg";

type BrandLogoProps = {
  width?: number;
};

export default function BrandLogo({ width = 270 }: BrandLogoProps) {
  const height = width * 0.72;

  return (
    <Svg width={width} height={height} viewBox="0 0 500 360" accessibilityLabel="Biryani Bytes logo">
      <G fill="none" stroke="#85898C" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M92 125 C57 176 50 240 76 285 C116 350 384 350 424 285 C450 240 443 176 408 125" />
        <Ellipse cx="250" cy="119" rx="192" ry="47" fill="#85898C" stroke="none" />
        <Path d="M61 116 C80 151 420 157 439 116" stroke="#85898C" />
        <Path d="M119 272 C180 315 320 320 381 276" />
        <Path d="M149 232 C184 255 218 267 254 273" />
        <Path d="M374 112 C389 130 401 149 411 168" />
      </G>
      <Rect x="208" y="78" width="84" height="22" rx="11" fill="#85898C" />
      <G fill="none" stroke="#F28C00" strokeWidth="10" strokeLinecap="round">
        <Path d="M174 70 C151 47 181 36 175 12" />
        <Path d="M201 70 C178 44 208 31 202 4" />
        <Path d="M228 70 C205 43 235 29 229 0" />
      </G>
      <SvgText x="246" y="194" textAnchor="middle" fontSize="68" fontWeight="700" fill="#F28C00">Biryani</SvgText>
      <SvgText x="306" y="266" textAnchor="middle" fontSize="68" fontWeight="700" fill="#069B18">Bytes</SvgText>
    </Svg>
  );
}