import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5174;
const DIST_DIR = path.resolve(__dirname, '../dist');

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html';
    case '.js': return 'application/javascript';
    case '.css': return 'text/css';
    case '.json': return 'application/json';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.glb':
    case '.gltf': return 'model/gltf-binary';
    case '.bin': return 'application/octet-stream';
    case '.wav': return 'audio/wav';
    case '.mp3': return 'audio/mpeg';
    case '.svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

function startServer(): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url?.split('?')[0] || '/';
      // Handle base url /rideline/ or direct /
      if (reqPath.startsWith('/rideline/')) {
        reqPath = reqPath.replace('/rideline/', '/');
      }
      if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

      let filePath = path.join(DIST_DIR, reqPath);
      if (!fs.existsSync(filePath)) {
        // Fallback for public root assets
        const publicPath = path.resolve(__dirname, '../public', reqPath.replace(/^\//, ''));
        if (fs.existsSync(publicPath)) {
          filePath = publicPath;
        } else {
          filePath = path.join(DIST_DIR, 'index.html');
        }
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
        res.end(data);
      });
    });

    server.listen(PORT, () => {
      resolve(server);
    });
    server.on('error', reject);
  });
}

async function runBrowserEndurance() {
  console.log('====================================================');
  console.log('RIDELINE — AUTOMATED BROWSER ENDURANCE TEST');
  console.log('====================================================\n');

  let server: http.Server | null = null;
  try {
    server = await startServer();
    console.log(`Local static server listening on http://localhost:${PORT}`);

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--use-gl=angle',
        '--use-angle=swiftshader',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
      console.error('[Page Error]:', err.message);
    });

    console.log('Navigating to http://localhost:' + PORT + '...');
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for render canvas
    await page.waitForSelector('#renderCanvas', { timeout: 10000 });
    console.log('Canvas element rendered successfully.');

    // Wait for Ride button in Garage UI
    const rideBtn = await page.waitForSelector('#btn-garage-ride', { timeout: 15000 });
    if (!rideBtn) {
      throw new Error('Ride button not found in garage UI');
    }

    console.log('Clicking "ENTER RIDE" to launch ride...');
    await rideBtn.click();

    // Wait for HUD to become visible (game state changes to ride)
    await page.waitForFunction(
      () => {
        const hud = document.getElementById('rideline-hud');
        return hud && !hud.classList.contains('hidden');
      },
      { timeout: 35000 }
    );
    console.log('HUD active! Ride mode successfully initialized.');

    // Apply throttle input for 10 seconds of simulated continuous browser riding
    console.log('Simulating continuous throttle input (holding ArrowUp)...');
    await page.keyboard.down('ArrowUp');

    let maxSpeedSeen = 0;
    const sampleIntervalMs = 1000;
    const testDurationSec = 10;

    for (let s = 1; s <= testDurationSec; s++) {
      await new Promise((r) => setTimeout(r, sampleIntervalMs));
      const speedText = await page.evaluate(() => {
        const speedEl = document.getElementById('hud-speed-val');
        return speedEl ? speedEl.textContent : '0';
      });
      const speed = parseFloat(speedText || '0');
      if (speed > maxSpeedSeen) maxSpeedSeen = speed;
      console.log(`[Ride Second ${s}/${testDurationSec}] Speed: ${speed.toFixed(1)} km/h`);
    }

    await page.keyboard.up('ArrowUp');

    // Take verification screenshot
    const screenshotPath = '/Users/vincyvincent/.gemini/antigravity/brain/56fa44e6-c8c1-4f44-82d5-4b264ede9897/milestone_11_browser_endurance.png';
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved verification screenshot to ${screenshotPath}`);

    await browser.close();

    console.log('\n--- Test Assessment ---');
    console.log(`Max Speed Attained: ${maxSpeedSeen.toFixed(1)} km/h`);
    console.log(`Page Unhandled Errors: ${pageErrors.length}`);

    if (maxSpeedSeen > 10.0 && pageErrors.length === 0) {
      console.log('\n>>> BROWSER ENDURANCE SPEC PASSED! <<<\n');
      process.exit(0);
    } else {
      console.error('\n>>> BROWSER ENDURANCE SPEC FAILED! <<<\n');
      process.exit(1);
    }
  } catch (err) {
    console.error('Browser endurance test execution error:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
  }
}

runBrowserEndurance();
