from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(r"D:\lsw\artifacts\gameplay-loop-screenshots-2026-09-11")
OUTPUT = ROOT / "00-gameplay-loop-contact-sheet.png"
LABELS = {
    "01-desert-outpost-overview.png": "DESERT OUTPOST",
    "02-gear-iii-max-flight.png": "MOVEMENT GEAR III",
    "03-alt-free-look-bearing.png": "ALT FREE-LOOK",
    "04-tab-melee-finisher.png": "MELEE FINISHER",
    "05-energy-first-guard.png": "ENERGY-FIRST GUARD",
    "06-flying-person-carry-whirl.png": "FLYING CARRY + WHIRL",
    "07-beam-ground-burn-trail.png": "BEAM BURN TRAIL",
    "08-tempest-bounded-storm.png": "TEMPEST STORM",
    "09-zombie-outbreak-wave.png": "ZOMBIE OUTBREAK",
    "10-clone-recovery-case-and-squad.png": "CLONE RECOVERY",
    "11-police-first-response.png": "POLICE RESPONSE",
    "12-military-escalation-kuchler.png": "MILITARY ESCALATION",
    "13-clean-operation-report.png": "OPERATION REPORT",
}


def font(size: int):
    candidates = [
        Path(r"C:\Windows\Fonts\arialbd.ttf"),
        Path(r"C:\Windows\Fonts\segoeuib.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


files = [ROOT / name for name in LABELS if (ROOT / name).exists()]
columns = 3
thumb_w, thumb_h = 480, 270
label_h = 54
gap = 18
margin = 28
title_h = 86
rows = (len(files) + columns - 1) // columns
sheet_w = margin * 2 + columns * thumb_w + (columns - 1) * gap
sheet_h = margin * 2 + title_h + rows * (thumb_h + label_h) + (rows - 1) * gap

sheet = Image.new("RGB", (sheet_w, sheet_h), "#17140f")
draw = ImageDraw.Draw(sheet)
draw.text((margin, 18), "POWERWORLD — GAMEPLAY LOOP CAPTURES", fill="#f0c15a", font=font(32))
draw.text((margin, 56), "Merged build • 11 SEP 2026 • 1600 × 900 source frames", fill="#b7aa90", font=font(17))

for index, path in enumerate(files):
    row, column = divmod(index, columns)
    x = margin + column * (thumb_w + gap)
    y = margin + title_h + row * (thumb_h + label_h + gap)
    frame = Image.open(path).convert("RGB")
    frame.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (thumb_w, thumb_h), "#0d0c09")
    canvas.paste(frame, ((thumb_w - frame.width) // 2, (thumb_h - frame.height) // 2))
    sheet.paste(canvas, (x, y))
    draw.rectangle((x, y + thumb_h, x + thumb_w, y + thumb_h + label_h), fill="#241f16")
    draw.rectangle((x, y, x + thumb_w - 1, y + thumb_h + label_h - 1), outline="#6f5a2d", width=2)
    draw.text((x + 15, y + thumb_h + 14), LABELS[path.name], fill="#f3e8cf", font=font(20))

sheet.save(OUTPUT, quality=95)
print(OUTPUT)
