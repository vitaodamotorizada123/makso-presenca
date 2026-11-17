#!/usr/bin/env python3
"""QR estático (nunca expira) para o convite da maksō.

Uso: python3 -I scripts/qr.py https://makso.onrender.com/ assets/qr

Gera qr-makso.svg (vetor, para a gráfica) e qr-makso.png (2400×2400).
ECC nível Q (aguenta ~25% de dano, bom para papel texturizado e dobras),
zona de silêncio de 4 módulos, preto puro sobre branco (máximo contraste).
O QR aponta para a URL para sempre: o serviço no Render nunca pode ser
apagado nem renomeado.
"""
import os
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vendor'))
from qrcodegen import QrCode  # noqa: E402  (Nayuki, MIT)

BORDER = 4


def to_svg(qr: QrCode) -> str:
    size = qr.get_size() + BORDER * 2
    parts = []
    for y in range(qr.get_size()):
        for x in range(qr.get_size()):
            if qr.get_module(x, y):
                parts.append(f'M{x + BORDER},{y + BORDER}h1v1h-1z')
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" shape-rendering="crispEdges">'
        f'<rect width="{size}" height="{size}" fill="#ffffff"/>'
        f'<path d="{"".join(parts)}" fill="#000000"/></svg>\n'
    )


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        return 2
    url, out_dir = sys.argv[1], sys.argv[2]
    if not url.startswith('https://'):
        print('A URL precisa começar com https://', file=sys.stderr)
        return 1
    os.makedirs(out_dir, exist_ok=True)
    qr = QrCode.encode_text(url, QrCode.Ecc.QUARTILE)
    svg_path = os.path.join(out_dir, 'qr-makso.svg')
    png_path = os.path.join(out_dir, 'qr-makso.png')
    with open(svg_path, 'w', encoding='utf-8') as f:
        f.write(to_svg(qr))
    subprocess.run(['rsvg-convert', '-w', '2400', '-h', '2400', svg_path, '-o', png_path], check=True)
    print(f'QR versão {qr.get_version()} ({qr.get_size()}×{qr.get_size()} módulos) → {svg_path}, {png_path}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
