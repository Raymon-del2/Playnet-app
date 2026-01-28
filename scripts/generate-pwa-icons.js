const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');
const sourceImage = path.join(publicDir, 'Playra.png');

const sizes = [192, 512, 96, 144, 152, 384];

async function generateIcons() {
    if (!fs.existsSync(sourceImage)) {
        console.error('Source image Playra.png not found in public folder');
        return;
    }

    console.log('Generating square icons from Playra.png...');

    for (const size of sizes) {
        try {
            await sharp(sourceImage)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 10, g: 10, b: 10, alpha: 1 } // Match app background #0a0a0a
                })
                .toFile(path.join(publicDir, `icon-${size}x${size}.png`));

            console.log(`✅ Generated icon-${size}x${size}.png`);
        } catch (error) {
            console.error(`❌ Failed to generate icon ${size}:`, error);
        }
    }

    // Also generate a "maskable" version with more padding
    try {
        await sharp(sourceImage)
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 10, g: 10, b: 10, alpha: 1 },
                kernel: sharp.kernel.lanczos3
            })
            .extend({
                top: 64, bottom: 64, left: 64, right: 64,
                background: { r: 10, g: 10, b: 10, alpha: 1 }
            })
            .resize(512, 512)
            .toFile(path.join(publicDir, 'icon-maskable-512x512.png'));
        console.log('✅ Generated icon-maskable-512x512.png');
    } catch (error) {
        console.error('❌ Failed to generate maskable icon:', error);
    }

    console.log('Done! All icons generated.');
}

generateIcons().catch(console.error);
