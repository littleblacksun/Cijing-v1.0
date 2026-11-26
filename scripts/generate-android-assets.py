#!/usr/bin/env python3
"""Build launcher and startup assets from the original cover using Pillow."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"
COVER = ROOT / "app封面" / "逻辑填空.png"
WHITE = "#FFFFFF"
DENSITIES = {
    "mdpi": (48, 108, (320, 480)),
    "hdpi": (72, 162, (480, 800)),
    "xhdpi": (96, 216, (720, 1280)),
    "xxhdpi": (144, 324, (960, 1600)),
    "xxxhdpi": (192, 432, (1280, 1920)),
}
ADAPTIVE_VIEWPORT = 72 / 108


def centered(image: Image.Image, size: tuple[int, int], artwork_width: int) -> Image.Image:
    canvas = Image.new("RGB", size, WHITE)
    artwork = ImageOps.contain(image, (artwork_width, artwork_width), Image.Resampling.LANCZOS)
    offset = ((size[0] - artwork.width) // 2, (size[1] - artwork.height) // 2)
    canvas.paste(artwork, offset)
    return canvas


def round_canvas(image: Image.Image) -> Image.Image:
    side = image.width
    scale = 4
    mask = Image.new("L", (side * scale, side * scale))
    ImageDraw.Draw(mask).ellipse((0, 0, side * scale - 1, side * scale - 1), fill=255)
    image.putalpha(mask.resize(image.size, Image.Resampling.LANCZOS))
    return image


def save(image: Image.Image, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, optimize=True)


def main() -> None:
    if not (RES / "values" / "styles.xml").is_file():
        raise SystemExit("请先运行 npx cap add android")
    with Image.open(COVER) as original:
        cover = original.convert("RGB")
    if cover.width != cover.height:
        raise SystemExit("启动封面源图必须为正方形")

    for side in (192, 512):
        save(centered(cover, (side, side), side), ROOT / "public" / f"icon-{side}.png")

    for density, (legacy, foreground, portrait) in DENSITIES.items():
        mipmap = RES / f"mipmap-{density}"
        save(centered(cover, (foreground, foreground), round(foreground * ADAPTIVE_VIEWPORT)), mipmap / "ic_launcher_foreground.png")
        save(centered(cover, (legacy, legacy), legacy), mipmap / "ic_launcher.png")
        save(round_canvas(centered(cover, (legacy, legacy), legacy)), mipmap / "ic_launcher_round.png")

        landscape = portrait[::-1]
        save(centered(cover, portrait, round(portrait[0] * 0.62)), RES / f"drawable-port-{density}" / "splash.png")
        save(centered(cover, landscape, round(landscape[1] * 0.55)), RES / f"drawable-land-{density}" / "splash.png")

    portrait = DENSITIES["xxxhdpi"][2]
    save(centered(cover, portrait, round(portrait[0] * 0.62)), RES / "drawable" / "splash.png")
    save(centered(cover, (576, 576), round(576 * 0.62)), RES / "drawable-nodpi" / "splash_icon.png")
    print("已生成 2 个 Web 图标、5 套桌面图标、11 张启动封面和 Android 12+ 启动图标。")


if __name__ == "__main__":
    main()
