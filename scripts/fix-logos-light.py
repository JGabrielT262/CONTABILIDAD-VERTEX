from PIL import Image
from pathlib import Path

public = Path(r"D:\VERTEX SOFTWARE\CONTABILIDAD VERTEX\public")


def extract_from_black(src_name: str, dst_name: str, black_cut: int = 18):
    """
    Logos diseñados sobre negro (brillo / neón):
    - alpha ~ brillo del pixel
    - se 'descompone' el negro (un-premultiply)
    Así desaparecen los bordes negros sobre fondos claros.
    """
    im = Image.open(public / src_name).convert("RGBA")
    pixels = im.load()
    w, h = im.size

    for y in range(h):
        for x in range(w):
            r, g, b, _ = pixels[x, y]
            mx = max(r, g, b)
            if mx <= black_cut:
                pixels[x, y] = (0, 0, 0, 0)
                continue

            # Un-premultiply desde fondo negro
            scale = 255.0 / mx
            nr = min(255, int(round(r * scale)))
            ng = min(255, int(round(g * scale)))
            nb = min(255, int(round(b * scale)))

            # Alpha suave según brillo; deja pasar azules tenues del lettering
            alpha = min(255, int(round(mx * 1.15)))
            pixels[x, y] = (nr, ng, nb, alpha)

    # Segunda pasada: elimina franjas casi negras restantes
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            if max(r, g, b) < 30 and a < 90:
                pixels[x, y] = (0, 0, 0, 0)

    bbox = im.getbbox()
    if bbox:
        # padding pequeño
        pad = 8
        left = max(0, bbox[0] - pad)
        top = max(0, bbox[1] - pad)
        right = min(w, bbox[2] + pad)
        bottom = min(h, bbox[3] + pad)
        im = im.crop((left, top, right, bottom))

    im.save(public / dst_name, optimize=True)
    print(dst_name, im.size, "saved")


extract_from_black("logo-full.png", "logo-full-light.png")
extract_from_black("logo.png", "logo-light.png")
extract_from_black("logo-full.png", "logo-full-transparent.png")
extract_from_black("logo.png", "logo-transparent.png")

# Preview sobre fondo del sistema
logo = Image.open(public / "logo-full-light.png").convert("RGBA")
bg = Image.new("RGBA", logo.size, (240, 243, 247, 255))
bg.alpha_composite(logo)
bg.convert("RGB").save(public / "logo-preview-light.jpg", quality=95)
print("done")
