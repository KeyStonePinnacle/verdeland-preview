# House models publishing workflow

The House Models page is at `/house-models.html`. No actual house models have
been supplied yet, so it deliberately shows an illustrated empty state.

1. Keep the editable `.blend` master in your source/design storage.
2. Export a browser copy from Blender as glTF 2.0, format **glTF Binary (.glb)**.
   Include materials/textures in the GLB. Initially use uncompressed geometry
   and ordinary PNG/JPEG textures to avoid additional decoder dependencies.
3. Add the GLB here, along with an optional JPG poster rendered in Blender.
4. Add an entry to `catalog.js` using its commented example. Give it the actual
   plan name and a short description, and identify design concepts accurately.
5. Serve `prototype/`, open `/house-models.html`, and check orbit, zoom, reset,
   mobile loading, and material appearance before deployment.

The viewer loads only when the catalog contains a model. It uses a self-hosted
Google model-viewer 4.3.1 distribution in `assets/vendor/` (Apache 2.0; license
included). Models are served from this site. No uploads, external model
hosting, or editing of the source Blender files happen in the visitor page.

Reference: https://modelviewer.dev/examples/loading/
