import os
from PIL import Image
import cairosvg
import io

def generate_icons():
    # Ensure images directory exists
    os.makedirs('images', exist_ok=True)
    
    # Read the SVG content
    with open('images/logo.svg', 'rb') as f:
        svg_content = f.read()
    
    # Generate logo-192x192.png
    png_data = cairosvg.svg2png(bytestring=svg_content, output_width=192, output_height=192)
    with open('images/logo-192x192.png', 'wb') as f:
        f.write(png_data)
    
    # Generate logo-512x512.png
    png_data = cairosvg.svg2png(bytestring=svg_content, output_width=512, output_height=512)
    with open('images/logo-512x512.png', 'wb') as f:
        f.write(png_data)
    
    # Generate badge-72x72.png
    png_data = cairosvg.svg2png(bytestring=svg_content, output_width=72, output_height=72)
    with open('images/badge-72x72.png', 'wb') as f:
        f.write(png_data)
    
    # Generate favicon.ico (16x16, 32x32, 48x48)
    png_data_16 = cairosvg.svg2png(bytestring=svg_content, output_width=16, output_height=16)
    png_data_32 = cairosvg.svg2png(bytestring=svg_content, output_width=32, output_height=32)
    png_data_48 = cairosvg.svg2png(bytestring=svg_content, output_width=48, output_height=48)
    
    # Create favicon.ico with multiple sizes
    icon_sizes = [(16, png_data_16), (32, png_data_32), (48, png_data_48)]
    
    # Create a list of PIL Images
    pil_images = []
    for size, data in icon_sizes:
        img = Image.open(io.BytesIO(data))
        pil_images.append(img)
    
    # Save as ICO with multiple sizes
    pil_images[0].save('images/favicon.ico', format='ICO', sizes=[(img.width, img.height) for img in pil_images], append_images=pil_images[1:])
    
    print("Icons generated successfully!")

if __name__ == "__main__":
    try:
        generate_icons()
    except Exception as e:
        print(f"Error generating icons: {e}")
        print("\nIf you see errors about cairosvg, install it with:")
        print("pip install cairosvg pillow")
