
/**
 * Advanced Utility for Realistic PBR Map Derivation
 */

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

export const generateNormalMap = async (imageSrc: string, strength: number = 2.5): Promise<string> => {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas context failed");

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const { width, height } = canvas;
  const output = ctx.createImageData(width, height);
  const outData = output.data;

  // Function to get grayscale value with basic noise reduction (average of neighbors)
  const getSmoothHeight = (x: number, y: number) => {
    let total = 0;
    let count = 0;
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const nx = Math.max(0, Math.min(width - 1, x + ox));
        const ny = Math.max(0, Math.min(height - 1, y + oy));
        const px = (nx + ny * width) * 4;
        total += (data[px] + data[px + 1] + data[px + 2]) / 765.0;
        count++;
      }
    }
    return total / count;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // Sobel operator for better edge detection and realistic depth
      const hL = getSmoothHeight(x - 1, y);
      const hR = getSmoothHeight(x + 1, y);
      const hU = getSmoothHeight(x, y - 1);
      const hD = getSmoothHeight(x, y + 1);

      const dx = (hL - hR) * strength;
      const dy = (hU - hD) * strength;
      const dz = 1.0;

      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      outData[idx] = ((dx / len) * 0.5 + 0.5) * 255;
      outData[idx + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      outData[idx + 2] = ((dz / len) * 0.5 + 0.5) * 255;
      outData[idx + 3] = 255;
    }
  }

  ctx.putImageData(output, 0, 0);
  return canvas.toDataURL('image/png');
};

export const generateRoughnessMap = async (imageSrc: string, multiplier: number = 1.0): Promise<string> => {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Canvas context failed");

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    // For realism, we invert and add contrast: 
    // Crevices (dark) are rougher, surfaces (light) are smoother
    let val = (255 - avg) * multiplier;
    // Contrast boost
    val = ((val / 255 - 0.5) * 1.5 + 0.5) * 255;
    data[i] = data[i + 1] = data[i + 2] = Math.min(255, Math.max(0, val));
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

export const generateAOMap = async (imageSrc: string): Promise<string> => {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Canvas context failed");

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    // Aggressive AO contrast to define realistic depth shadows
    let val = avg < 100 ? (avg / 100) * 255 : 255;
    data[i] = data[i + 1] = data[i + 2] = val;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

export const generateMetalnessMap = async (imageSrc: string, isMetal: boolean): Promise<string> => {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Canvas context failed");
  canvas.width = img.width;
  canvas.height = img.height;
  
  const val = isMetal ? 255 : 0;
  ctx.fillStyle = `rgb(${val},${val},${val})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
};

export const generateHeightMap = async (imageSrc: string): Promise<string> => {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Canvas context failed");
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    // Enhanced height map contrast
    let val = ((avg / 255 - 0.5) * 1.2 + 0.5) * 255;
    data[i] = data[i + 1] = data[i + 2] = Math.min(255, Math.max(0, val));
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};
