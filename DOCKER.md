# Docker Deployment & babylon-mmd Production Runtime

## Docker Setup

The project is configured to run on **port 20310** both in development and production.

### Quick Start (App Only)

```bash
# Build and run just the app (no tunnel)
docker compose up -d

# View logs
docker compose logs -f app

# Stop services
docker compose down
```

Access at: `http://localhost:20310`

### With Cloudflare Tunnel (Host Machine)

**⚠️ Important:** Cloudflare tunnel does NOT work reliably inside Docker due to network constraints. Instead, run it on your host machine:

**Setup:**

1. Install cloudflared on your host:

   - **Windows**: `choco install cloudflare-warp` or download from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
   - **macOS**: `brew install cloudflare/cloudflare/cloudflared`
   - **Linux**: `curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i cloudflared.deb`

2. Get your tunnel token from: https://dash.cloudflare.com/?to=/:account/networks/tunnels

3. Run the tunnel on your host (in a separate terminal, NOT in Docker):

   ```bash
   cloudflared tunnel run --token eyJhIjoiXHUwMDAlbm...your_token_here
   ```

4. Keep Docker running in another terminal:
   ```bash
   docker compose up -d
   ```

The tunnel will proxy `https://your-domain.com` → `http://localhost:20310` (Docker container)

## babylon-mmd Production Runtime

According to [babylon-mmd documentation](https://noname0310.github.io/babylon-mmd/docs/reference/runtime/), babylon-mmd provides **three main production-ready runtime combinations**:

### SharedArrayBuffer Support (WASM Multi-Threading)

This project includes a **custom Express.js server** ([server.js](server.js)) that provides the required HTTP headers for WebAssembly multi-threading:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

These headers enable `crossOriginIsolated` in the browser, which is **required** for SharedArrayBuffer transfers used by babylon-mmd's WASM thread pool.

### 1. **Most Stable (Easy Customization)**

Best for development and when you need to modify behavior:

```typescript
// Evaluate Animation
import {
  MmdRuntimeCameraAnimation,
  MmdRuntimeModelAnimation,
} from "babylon-mmd";

// Solve IK, Append Transform, Morph
import { MmdRuntime } from "babylon-mmd";

// Simulate Physics
import { MmdBulletPhysics } from "babylon-mmd";
```

**Use this for:**

- Custom bone controls
- Animation modifications
- Debugging animations

---

### 2. **Highest Performance (Production Recommended)** ⭐

Uses WebAssembly for maximum speed and efficiency:

```typescript
// Evaluate Animation (Camera still JavaScript)
import {
  MmdRuntimeCameraAnimation,
  MmdWasmRuntimeModelAnimation,
} from "babylon-mmd";

// Solve IK, Append Transform, Morph (WebAssembly)
import { MmdWasmRuntime } from "babylon-mmd";

// Simulate Physics (WebAssembly)
import { MmdWasmPhysics } from "babylon-mmd";
```

**Characteristics:**

- ~30-50% faster than JavaScript implementation
- Better performance for multiple models
- Difficult to customize (fixed behavior)
- Best for production deployment

**Use this for:**

- Public-facing applications
- High-performance requirements
- Multiple simultaneous models

---

### 3. **No WebAssembly Support (Fallback)**

For environments that cannot run WebAssembly (rare):

```typescript
import {
  MmdRuntimeCameraAnimation,
  MmdRuntimeModelAnimation,
} from "babylon-mmd";
import { MmdRuntime } from "babylon-mmd";
import { MmdAmmoPhysics } from "babylon-mmd"; // Fallback physics
```

---

## Current Implementation

This project uses the **stable combination** (Option 1) by default:

- **Animation Evaluation**: `MmdRuntimeCameraAnimation` + `MmdRuntimeModelAnimation`
- **IK/Transform/Morph**: `MmdRuntime`
- **Physics**: `MmdBulletPhysics`

### Switching to WASM (Recommended for Production)

To upgrade to WebAssembly-based runtime for better performance:

1. Update [src/vmdAnimationController.ts](src/vmdAnimationController.ts):

   ```typescript
   // Change from:
   // import { MmdWasmRuntimeModelAnimation } from "babylon-mmd";

   // To:
   import { MmdWasmRuntimeModelAnimation } from "babylon-mmd";
   ```

2. Update [src/sceneBuilder.ts](src/sceneBuilder.ts):

   ```typescript
   // Change from:
   // const runtime = new MmdRuntime();

   // To:
   const runtime = new MmdWasmRuntime();
   ```

3. Rebuild:
   ```bash
   npm run build
   ```

## babylon-mmd Runtime Components Reference

### Animation Evaluation Options

| Component                           | Type              | Performance | Use Case            |
| ----------------------------------- | ----------------- | ----------- | ------------------- |
| `MmdRuntimeCameraAnimation`         | JavaScript        | Stable      | Standard            |
| `MmdRuntimeModelAnimation`          | JavaScript        | Stable      | Standard            |
| `MmdWasmRuntimeModelAnimation`      | WebAssembly       | **High**    | **Production**      |
| `MmdCompositeRuntimeModelAnimation` | JavaScript        | Stable      | Animation blending  |
| `AnimationGroup`                    | Babylon.js native | Variable    | Babylon integration |

### IK/Transform/Morph Options

| Component        | Type        | Performance | Customizable |
| ---------------- | ----------- | ----------- | ------------ |
| `MmdRuntime`     | JavaScript  | Stable      | ✅ Easy      |
| `MmdWasmRuntime` | WebAssembly | **High**    | ❌ Difficult |

### Physics Options

| Component          | Type        | Performance | Compatibility     |
| ------------------ | ----------- | ----------- | ----------------- |
| `MmdBulletPhysics` | WebAssembly | Excellent   | All environments  |
| `MmdWasmPhysics`   | WebAssembly | **Highest** | Modern browsers   |
| `MmdAmmoPhysics`   | Asm.js      | Low         | Older browsers    |
| `MmdPhysics`       | Havok       | Low         | Havok integration |

---

## Docker Image Optimization

The Dockerfile uses a **multi-stage build**:

1. **Build Stage**: Compiles TypeScript, optimizes with webpack (modern-only bundles)
2. **Production Stage**: Minimal runtime with Express.js server for proper header support

### File Exclusions (.dockerignore)

- `.git`, `node_modules`, `coverage` (reduces context size)
- Build artifacts are kept (`tsconfig.json`, `webpack.config.ts`, etc.)
- Configuration files needed for build are included

### Health Check

- **Interval**: 30s
- **Timeout**: 10s
- **Start Period**: 45s (allows Node build to complete)
- **Retries**: 3

The health check uses Node's built-in HTTP client (no external dependencies needed).

## Environment Variables

**Note:** The `.env` file is only needed if running Cloudflare tunnel on the host machine, and it's optional for local development.

```bash
# Optional - only for Cloudflare tunnel
TUNNEL_TOKEN=your_cloudflare_tunnel_token

# Docker compose sets this automatically
NODE_ENV=production
```

**Security:** `.env` is in `.gitignore` and should never be committed to git.

## Troubleshooting

### Container fails to start

```bash
# Check logs
docker compose logs app

# Verify build output
docker compose build --no-cache

# Rebuild from scratch
docker compose down
docker compose up -d --build
```

### High CPU usage

- Consider upgrading to WASM runtime (Option 2)
- Reduce number of simultaneous models
- Adjust physics simulation accuracy

### Models not loading

- Verify `res/` folder is copied in Docker
- Check texture/shader folder names are lowercase
- Ensure PMX/VMD files are in correct paths

### Cloudflare Tunnel Connection Issues

**Why tunnel doesn't work in Docker:**

- Docker's network stack has UDP buffer size limitations for QUIC protocol
- DNS and network routing issues in containerized environments
- Tunnel service can go "Down" status with timeouts and i/o errors

**Solution:** Run tunnel on your host machine instead (see section "With Cloudflare Tunnel (Host Machine)" above)

**If you must run tunnel in Docker:**

- Increase Docker/host UDP buffer sizes (Linux only):
  ```bash
  sudo sysctl -w net.core.rmem_max=7161856
  sudo sysctl -w net.core.rmem_default=7161856
  sudo sysctl -w net.core.wmem_max=7161856
  sudo sysctl -w net.core.wmem_default=7161856
  ```
- Results will likely still be degraded or unstable

## Performance Tips

1. **Use WASM runtime** for production (30-50% faster)
2. **Enable code splitting** in webpack (already configured)
3. **Lazy load models** - don't load all models at startup
4. **Use LOD (Level of Detail)** for distant models
5. **Monitor with babylon Inspector** (`scene.debugLayer.show()`)

---

**Reference**: [babylon-mmd Runtime Documentation](https://noname0310.github.io/babylon-mmd/docs/reference/runtime/)
