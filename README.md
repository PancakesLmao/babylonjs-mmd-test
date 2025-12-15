## babylon-mmd-template

Best practice for using babylon-mmd.

Implement and build high-quality mmd in the most optimized way possible with Babylon.js.

**If you want to use babylon-mmd, fork this repository could be a good starting point!**

## Build Settings

- typescript
- webpack (only resolve html template, typescript, and static files)
- Babylon.js (with es6 module tree shaking applied)
- eslint (Babyon.js coding style)

## Details

- Run it with `npm i` & `npm start`

- It will do the eslint fix for you on save
- All code is written in sceneBuilder.ts
- For Add assets put them in the res folder and request them as "res/{assetpath}"
- The sceneBuilder includes mmd sample code using webXR (See the comments in the code for a detailed explanation)

### The source structure of this project is as follows:
```
/ (root)
├── /res: Folder containing PMX models, VMD animations, MP3 audio, etc.
├── /src: Folder containing the project's source code
│   ├── /baseRuntime.ts: Babylon.js engine creation and rendering loop setup code
│   ├── /index.html: HTML template
│   ├── /index.ts: Entry point, creates scene using scene builder and starts rendering loop
│   └── /sceneBuilder.ts: Code that configures the Scene
```
**When loading models, make sure the files name are `textures` and `shaders` (Lower case not Uppercase)**