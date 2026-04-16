from PIL import Image

def is_white(pixel):
    return pixel[0] >= 235 and pixel[1] >= 235 and pixel[2] >= 235

img = Image.open('src/assets/qr-poster-template.jpg')
width, height = img.size
print(f"Image size: {width}x{height}")

# Find bounds for top large white box (starts somewhere around 500-1000)
# Find bounds for bottom white box (starts somewhere around 1500-2200)

white_pixels = []
for y in range(0, height, 5):
    line_has_white = False
    for x in range(0, width, 5):
        if is_white(img.getpixel((x, y))):
            white_pixels.append((x, y))

# Group loosely into two regions based on Y coordinate gap
regions = []
current_region = []
last_y = -1

white_ys = sorted(list(set([y for x, y in white_pixels])))

current_group = []
for y in white_ys:
    if not current_group:
        current_group.append(y)
    else:
        if y - current_group[-1] < 100:
            current_group.append(y)
        else:
            regions.append(current_group)
            current_group = [y]
if current_group:
    regions.append(current_group)

for i, region in enumerate(regions):
    min_y = min(region)
    max_y = max(region)
    # Find min/max X for this Y range
    xs = [x for x, y in white_pixels if min_y <= y <= max_y]
    if xs:
        min_x = min(xs)
        max_x = max(xs)
        print(f"Region {i+1}: x={min_x}-{max_x} (width={max_x-min_x}), y={min_y}-{max_y} (height={max_y-min_y})")
