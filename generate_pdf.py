import subprocess
import os
import tempfile
import shutil
from PIL import Image

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
temp_dir = r'C:\Users\divya\clubapp\temp_slides'
os.makedirs(temp_dir, exist_ok=True)

user_data = os.path.join(tempfile.gettempdir(), 'chrome_pitch_pdf_render_hd')
shutil.rmtree(user_data, ignore_errors=True)

images = []
print("Rendering 10 ultra-sharp 2400x1350 QHD presentation slides...", flush=True)

for slide_num in range(1, 11):
    shot_path = os.path.join(temp_dir, f'slide_{slide_num}.png')
    if os.path.exists(shot_path):
        os.remove(shot_path)
        
    url = f'http://localhost:8081/pitch.html?slide={slide_num}&hideNav=true&zoom=1.5'
    
    cmd = [
        chrome_path,
        '--headless=new',
        f'--user-data-dir={user_data}',
        f'--screenshot={shot_path}',
        '--window-size=2400,1350',
        '--disable-gpu',
        '--no-sandbox',
        url
    ]
    
    subprocess.run(cmd, timeout=20)
    
    if os.path.exists(shot_path):
        img = Image.open(shot_path).convert('RGB')
        images.append(img)
        print(f"Slide {slide_num}/10 captured: {img.size} ({os.path.getsize(shot_path)} bytes)", flush=True)
    else:
        print(f"Warning: Failed to capture slide {slide_num}", flush=True)

if images:
    output_pdf = r'C:\Users\divya\clubapp\PlayGolf_Pitch_Presentation.pdf'
    public_pdf = r'C:\Users\divya\clubapp\frontend\public\PlayGolf_Pitch_Presentation.pdf'
    
    # Save with 300 DPI metadata and high quality JPEG compression within PDF for razor-sharp clarity
    images[0].save(
        output_pdf,
        save_all=True,
        append_images=images[1:],
        resolution=300.0,
        quality=95
    )
    images[0].save(
        public_pdf,
        save_all=True,
        append_images=images[1:],
        resolution=300.0,
        quality=95
    )
    print(f"SUCCESS: Generated Ultra-HD PDF at {output_pdf} ({os.path.getsize(output_pdf)} bytes)", flush=True)

shutil.rmtree(user_data, ignore_errors=True)
