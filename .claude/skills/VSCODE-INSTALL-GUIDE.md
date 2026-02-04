# 🎯 VS Code GitHub Copilot Skill: Installation Guide

Complete installation and usage guide for Three.js Mastery skill in VS Code.

## 📦 What You Have

Two formats available:
- `threejs-mastery-vscode-skill.zip` - ZIP archive (universal)
- `threejs-mastery-vscode-skill.tar.gz` - TAR.GZ archive (Linux/Mac)

Both contain the same files:
```
threejs-mastery/
├── SKILL.md                    # Main skill (auto-loaded by Copilot)
├── README.md                   # This documentation
├── examples.md                 # Code snippets library
├── performance-profiler.ts     # Performance monitoring tool
└── asset-optimizer.js          # Asset optimization script
```

## 🚀 Quick Install (3 Steps)

### Step 1: Enable Agent Skills in VS Code

1. Open VS Code Settings: `Ctrl+,` (Windows/Linux) or `⌘,` (Mac)
2. Search for: `chat.useAgentSkills`
3. **Check the box** to enable

**Or add to settings.json:**
```json
{
  "chat.useAgentSkills": true
}
```

### Step 2: Extract to Skills Directory

**Option A: User-level (all projects)**
```bash
# Create directory
mkdir -p ~/.claude/skills

# Extract archive
cd ~/.claude/skills
unzip ~/Downloads/threejs-mastery-vscode-skill.zip
# OR
tar -xzf ~/Downloads/threejs-mastery-vscode-skill.tar.gz
```

**Option B: Project-level (current project only)**
```bash
# In your project root
mkdir -p .claude/skills

# Extract archive
cd .claude/skills
unzip ~/Downloads/threejs-mastery-vscode-skill.zip
# OR
tar -xzf ~/Downloads/threejs-mastery-vscode-skill.tar.gz
```

### Step 3: Verify Installation

1. Open VS Code
2. Open Copilot Chat: `Ctrl+Alt+I` (Windows/Linux) or `⌘⌥I` (Mac)
3. Type: `what skills are available?`
4. You should see **threejs-mastery** in the list!

## ✅ Test the Skill

Try these prompts in Copilot Chat:

```
Create a basic Three.js scene with WebGPU
```

```
Set up React Three Fiber with orbital controls
```

```
Generate a particle system with 10000 particles
```

```
Optimize my scene for mobile devices
```

If Copilot provides detailed, modern Three.js code with TypeScript types and WebGPU support - **it's working!** 🎉

## 📂 Installation Locations Explained

VS Code/Copilot checks these locations **in order**:

### 1. User Profile (Recommended)
**Path:** `~/.claude/skills/`

**Pros:**
- Available in ALL your projects
- Install once, use everywhere
- Survives project deletion

**Cons:**
- Can't have project-specific customization

**Use when:**
- You work on multiple Three.js projects
- You want consistent behavior everywhere

### 2. Workspace Root
**Path:** `.claude/skills/` (in project root)

**Pros:**
- Project-specific customization
- Can commit to Git for team sharing
- Overrides user-level skills

**Cons:**
- Need to install per project
- Lost if project deleted

**Use when:**
- Team collaboration
- Project-specific requirements
- Different Three.js versions per project

### 3. Repository (GitHub)
**Path:** `.github/skills/`

**Pros:**
- Shared via Git
- Team consistency
- CI/CD integration

**Cons:**
- Requires Git repository
- Public if repo is public

**Use when:**
- Open source project
- Large team standardization

## 🎯 How the Skill Activates

The skill **automatically activates** when Copilot detects:

### File Types
- `.js`, `.jsx`, `.ts`, `.tsx` files
- Working with Three.js imports

### Code Patterns
```javascript
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
```

### Keywords in Prompts
- "Three.js", "WebGPU", "shader"
- "3D scene", "renderer", "material"
- "React Three Fiber", "R3F"
- "particle system", "lighting"
- "performance optimization"

### Example Activation
```
You: "Create a rotating cube with PBR material"

Copilot: [Loads threejs-mastery skill]
         [Provides code with:]
         ✓ WebGPU renderer + fallback
         ✓ MeshPhysicalMaterial
         ✓ Proper animation loop
         ✓ TypeScript types
         ✓ Error handling
```

## 💡 Usage Tips

### 1. Be Specific
❌ Bad: "make 3D"
✅ Good: "Create Three.js scene with WebGPU renderer and orbital camera"

### 2. Mention Tech Stack
❌ Bad: "add particles"
✅ Good: "Add GPU particle system using compute shaders"

### 3. Request Best Practices
❌ Bad: "load model"
✅ Good: "Load GLTF model with Draco compression and error handling"

### 4. Use Code Context
- Select existing code before asking
- Copilot will understand context better
- Example: Select renderer code → "Optimize for mobile"

### 5. Follow-up Questions
```
Initial: "Create basic scene"
Follow-up: "Add post-processing bloom"
Follow-up: "Optimize for 60 FPS"
Follow-up: "Convert to React Three Fiber"
```

## 🔍 Verify Skill is Working

### Method 1: Check Copilot Response
Ask: `"Create Three.js scene"`

**With skill:**
```typescript
import * as THREE from 'three';

async function initRenderer(canvas: HTMLCanvasElement) {
  // WebGPU with fallback
  if ('gpu' in navigator) {
    const adapter = await navigator.gpu.requestAdapter();
    // ... modern patterns
  }
  // ... WebGL2 fallback
}
```

**Without skill:**
```javascript
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera();
const renderer = new THREE.WebGLRenderer();
// ... basic WebGL1 code
```

### Method 2: Check Files
```bash
# User level
ls ~/.claude/skills/threejs-mastery/SKILL.md

# Workspace level
ls .claude/skills/threejs-mastery/SKILL.md
```

### Method 3: VS Code Output
1. Open VS Code Output panel: `Ctrl+Shift+U` or `⌘⇧U`
2. Select "GitHub Copilot" from dropdown
3. Look for "Loading skill: threejs-mastery"

## 🛠️ Using the Tools

### Performance Profiler

Copy `performance-profiler.ts` to your project:

```typescript
import { PerformanceProfiler } from './performance-profiler';

const profiler = new PerformanceProfiler(renderer, scene);

// Add visual overlay
const overlay = profiler.createOverlay();
document.body.appendChild(overlay);

// In render loop
function animate() {
  profiler.begin();
  renderer.render(scene, camera);
  profiler.end();
  
  requestAnimationFrame(animate);
}
```

**Features:**
- Real-time FPS monitoring
- Memory leak detection
- Automatic optimization suggestions
- Performance score (0-100)
- Visual overlay

### Asset Optimizer

```bash
# Copy script to your project
cp ~/.claude/skills/threejs-mastery/asset-optimizer.js .

# Install dependencies
npm install sharp gltf-pipeline @gltf-transform/cli

# Optimize assets
node asset-optimizer.js --input ./public/assets --output ./dist/assets

# Options
node asset-optimizer.js \
  --input ./textures \
  --output ./optimized \
  --quality 90 \
  --verbose
```

**Features:**
- WebP texture compression
- KTX2 GPU compression
- GLTF/GLB optimization (Draco)
- Batch processing
- Compression statistics

## 🔧 Customization

### Edit the Skill

```bash
# Open in VS Code
code ~/.claude/skills/threejs-mastery/SKILL.md
```

You can:
- Add project-specific patterns
- Include custom shaders
- Add company coding standards
- Reference internal documentation

**Example Addition:**
```markdown
## Our Company Standards

### Material Naming
- Use prefix: `mat_` for materials
- Example: `mat_wood_oak`, `mat_metal_steel`

### Texture Organization
- Store in `/assets/textures/`
- Use KTX2 format
- Max size: 2048x2048
```

### Share with Team

```bash
# Commit to repository
git add .claude/skills/threejs-mastery/
git commit -m "Add Three.js Mastery skill"
git push

# Team members just clone and enable setting
git clone <repo>
# Enable chat.useAgentSkills in settings
```

## ❓ Troubleshooting

### Skill Not Activating

**Check 1: Setting enabled?**
```json
// settings.json should have:
"chat.useAgentSkills": true
```

**Check 2: File exists?**
```bash
ls -la ~/.claude/skills/threejs-mastery/SKILL.md
```

**Check 3: Restart VS Code**
```
Close and reopen VS Code completely
```

**Check 4: Try explicit prompt**
```
"Using Three.js Mastery skill, create a scene"
```

### Old/Wrong Code Generated

**Update Three.js:**
```bash
npm install three@latest
npm install @types/three@latest
```

**Check version in package.json:**
```json
{
  "dependencies": {
    "three": "^0.170.0"  // Should be r170+
  }
}
```

### Conflicts with Other Skills

Skills are loaded by relevance. If another skill activates:
```
# Be more specific
"Using Three.js skill, create WebGPU renderer"
```

## 📊 What to Expect

### Code Quality
- ✅ TypeScript definitions
- ✅ Error handling
- ✅ Memory cleanup
- ✅ Mobile optimization
- ✅ WebGPU + WebGL2 fallback

### Performance
- ✅ 60 FPS target
- ✅ LOD systems
- ✅ Instancing
- ✅ Object pooling
- ✅ Texture compression

### Modern Patterns (2026)
- ✅ WebGPU as default
- ✅ PBR materials
- ✅ React Three Fiber
- ✅ Compute shaders
- ✅ Proper disposal

## 🎓 Learning Resources

The skill references:

**Official:**
- Three.js Docs: https://threejs.org/docs/
- WebGPU: https://webgpufundamentals.org/
- R3F: https://docs.pmnd.rs/react-three-fiber/

**Courses:**
- Three.js Journey: https://threejs-journey.com/
- Discover Three.js: https://discoverthreejs.com/

**Community:**
- Discourse: https://discourse.threejs.org/
- GitHub: https://github.com/mrdoob/three.js

## 🆘 Need Help?

1. **Check examples.md** - 10+ ready-to-use code examples
2. **Read SKILL.md** - Complete patterns and best practices
3. **Ask Copilot** - "Explain this Three.js pattern"
4. **Community** - Three.js Discourse forum

## 🎯 Next Steps

1. ✅ Install skill
2. ✅ Enable setting
3. ✅ Test with prompt
4. 🚀 Start building amazing 3D experiences!

---

**Version:** 2026.1  
**Compatible with:** VS Code 1.95+, Three.js r170+, WebGPU  
**Updated:** January 2026

**Happy coding! 🚀✨**
