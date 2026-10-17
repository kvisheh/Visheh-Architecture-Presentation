# Visheh Architecture Presentation

A responsive, static architectural presentation for GitHub Pages. Visitors can select camera locations on the schematic plan, move through fixed viewpoints, and open material information markers.

## Add the approved room renders

Create `assets/renders/` and add these JPEG files:

- `camera-01.jpg` — Living room toward the garden terrace
- `camera-02.jpg` — Dining area looking toward the living room
- `camera-03.jpg` — Kitchen and island
- `camera-04.jpg` — Master bedroom
- `camera-05.jpg` — Bedroom 02

The matching view will appear automatically. Until a file is added, the viewer displays a designed stand-in with a clear render placeholder. Camera order, labels, image paths, and material details are in `script.js`.

## Edit the material information

In `script.js`, edit the `materials` list for each camera. Each entry supports a title, category, description, manufacturer, finish or colour, location, and marker position (`x` and `y`, as percentages of the render frame). The current text calls out fields that need confirmed product information.

## Publish with GitHub Pages

The site uses plain HTML, CSS, JavaScript, and relative asset paths; it does not require a build step. In the repository, open **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/(root)`, then save. The site will be available at `https://kvisheh.github.io/Visheh-Architecture-Presentation/` after Pages finishes its first deployment.

The floor plan in this first version is an illustrative schematic, marked **not to scale**. Replace the SVG in `index.html` with the approved plan before presenting it as the project's actual layout.
