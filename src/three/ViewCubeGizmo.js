import * as THREE from "three";
import LoggerFactory from "../core/LoggerFactory.js";

const LOG = LoggerFactory.createLogger("ViewCubeGizmo");

const FACES = {
    TOP: '1',
    FRONT: '2',
    RIGHT: '3',
    BACK: '4',
    LEFT: '5',
    BOTTOM: '6',
    TOP_FRONT_EDGE: '7',
    TOP_RIGHT_EDGE: '8',
    TOP_BACK_EDGE: '9',
    TOP_LEFT_EDGE: '10',
    FRONT_RIGHT_EDGE: '11',
    BACK_RIGHT_EDGE: '12',
    BACK_LEFT_EDGE: '13',
    FRONT_LEFT_EDGE: '14',
    BOTTOM_FRONT_EDGE: '15',
    BOTTOM_RIGHT_EDGE: '16',
    BOTTOM_BACK_EDGE: '17',
    BOTTOM_LEFT_EDGE: '18',
    TOP_FRONT_RIGHT_CORNER: '19',
    TOP_BACK_RIGHT_CORNER: '20',
    TOP_BACK_LEFT_CORNER: '21',
    TOP_FRONT_LEFT_CORNER: '22',
    BOTTOM_FRONT_RIGHT_CORNER: '23',
    BOTTOM_BACK_RIGHT_CORNER: '24',
    BOTTOM_BACK_LEFT_CORNER: '25',
    BOTTOM_FRONT_LEFT_CORNER: '26'
};

const CORNER_FACES = [
    { name: FACES.TOP_FRONT_RIGHT_CORNER },
    { name: FACES.TOP_BACK_RIGHT_CORNER },
    { name: FACES.TOP_BACK_LEFT_CORNER },
    { name: FACES.TOP_FRONT_LEFT_CORNER },
    { name: FACES.BOTTOM_BACK_RIGHT_CORNER },
    { name: FACES.BOTTOM_FRONT_RIGHT_CORNER },
    { name: FACES.BOTTOM_FRONT_LEFT_CORNER },
    { name: FACES.BOTTOM_BACK_LEFT_CORNER }
];

const EDGE_FACES = [
    { name: FACES.TOP_FRONT_EDGE },
    { name: FACES.TOP_RIGHT_EDGE },
    { name: FACES.TOP_BACK_EDGE },
    { name: FACES.TOP_LEFT_EDGE },
    { name: FACES.BOTTOM_BACK_EDGE },
    { name: FACES.BOTTOM_RIGHT_EDGE },
    { name: FACES.BOTTOM_FRONT_EDGE },
    { name: FACES.BOTTOM_LEFT_EDGE }
];

const EDGE_FACES_SIDE = [
    { name: FACES.FRONT_RIGHT_EDGE },
    { name: FACES.BACK_RIGHT_EDGE },
    { name: FACES.BACK_LEFT_EDGE },
    { name: FACES.FRONT_LEFT_EDGE }
];

const COLORS = {
    MAIN: 0xdddddd,
    HOVER: 0xf2f5ce,
    OUTLINE: 0xcccccc,
    TEXT: '#333333'
};

const ObjectPosition = {
    LEFT_BOTTOM: 0,
    LEFT_TOP: 1,
    RIGHT_TOP: 2,
    RIGHT_BOTTOM: 4
};

// Internal ViewCube Geometry Class (Replicating ViewCube.ts)
class ViewCube extends THREE.Object3D {
    constructor(cubeSize = 2, borderSize = 0.2, isShowOutline = true, faceColor = COLORS.MAIN, outlineColor = COLORS.OUTLINE) {
        super();
        this._cubeSize = cubeSize;
        this._borderSize = borderSize;
        this._isShowOutline = isShowOutline;
        this._faceColor = faceColor;
        this._outlineColor = outlineColor;
        
        const faceNames = {
            front: 'FRONT', right: 'RIGHT', back: 'BACK', 
            left: 'LEFT', top: 'TOP', bottom: 'BOTTOM'
        };

        this.build(faceNames);
    }

    dispose() {
        this.traverse(child => {
            if (child.isMesh) {
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
                if (child.geometry) child.geometry.dispose();
            } else if (child.isLineSegments) {
                if (child.material) child.material.dispose();
                if (child.geometry) child.geometry.dispose();
            }
        });
    }

    build(faceNames) {
        const faceSize = this._cubeSize - this._borderSize * 2;
        const faceOffset = this._cubeSize / 2;
        const borderSize = this._borderSize;

        // Faces
        const cubeFaces = this.createCubeFaces(faceSize, faceOffset);
        const faceMaterials = this.createFaceMaterials(faceNames);
        
        // Map materials to faces
        const faceMap = {
            [FACES.FRONT]: cubeFaces.children[0],
            [FACES.RIGHT]: cubeFaces.children[1],
            [FACES.BACK]: cubeFaces.children[2],
            [FACES.LEFT]: cubeFaces.children[3],
            [FACES.TOP]: cubeFaces.children[4],
            [FACES.BOTTOM]: cubeFaces.children[5]
        };

        faceMaterials.forEach(mat => {
            const face = faceMap[mat.name];
            if (face) {
                face.material.color.setHex(this._faceColor);
                face.material.map = mat.map;
                face.name = mat.name;
            }
        });
        this.add(cubeFaces);

        // Corners
        const corners = [];
        CORNER_FACES.forEach((props, i) => {
            const corner = this.createCornerFaces(borderSize, faceOffset, props.name, { color: this._faceColor });
            corner.rotateOnAxis(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad((i % 4) * 90));
            corners.push(corner);
        });

        const topCorners = new THREE.Group();
        const bottomCorners = new THREE.Group();
        topCorners.add(...corners.slice(0, 4));
        bottomCorners.add(...corners.slice(4));
        bottomCorners.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI);
        
        this.add(topCorners);
        this.add(bottomCorners);

        // Edges (Top + Bottom)
        const edges = [];
        EDGE_FACES.forEach((props, i) => {
            const edge = this.createHorzEdgeFaces(faceSize, borderSize, faceOffset, props.name, { color: this._faceColor });
            edge.rotateOnAxis(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad((i % 4) * 90));
            edges.push(edge);
        });

        const topEdges = new THREE.Group();
        const bottomEdges = new THREE.Group();
        topEdges.add(...edges.slice(0, 4));
        bottomEdges.add(...edges.slice(4));
        bottomEdges.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI);

        this.add(topEdges);
        this.add(bottomEdges);

        // Side Edges
        const sideEdges = new THREE.Group();
        EDGE_FACES_SIDE.forEach((props, i) => {
            const edge = this.createVertEdgeFaces(borderSize, faceSize, faceOffset, props.name, { color: this._faceColor });
            edge.rotateOnAxis(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(i * 90));
            sideEdges.add(edge);
        });
        this.add(sideEdges);

        if (this._isShowOutline) {
            this.add(this.createCubeOutline(this._cubeSize));
        }
    }

    createFace(size, position, { axis = [0, 1, 0], angle = 0, name = '', matProps = {} } = {}) {
        if (!Array.isArray(size)) size = [size, size];
        const material = new THREE.MeshBasicMaterial(matProps);
        const geometry = new THREE.PlaneGeometry(size[0], size[1]);
        const face = new THREE.Mesh(geometry, material);
        face.name = name;
        face.rotateOnAxis(new THREE.Vector3(...axis), THREE.MathUtils.degToRad(angle));
        face.position.set(position[0], position[1], position[2]);
        return face;
    }

    createCubeFaces(faceSize, offset) {
        const faces = new THREE.Group();
        faces.add(this.createFace(faceSize, [0, 0, offset], { axis: [0, 1, 0], angle: 0 })); // Front
        faces.add(this.createFace(faceSize, [offset, 0, 0], { axis: [0, 1, 0], angle: 90 })); // Right
        faces.add(this.createFace(faceSize, [0, 0, -offset], { axis: [0, 1, 0], angle: 180 })); // Back
        faces.add(this.createFace(faceSize, [-offset, 0, 0], { axis: [0, 1, 0], angle: 270 })); // Left
        faces.add(this.createFace(faceSize, [0, offset, 0], { axis: [1, 0, 0], angle: -90 })); // Top
        faces.add(this.createFace(faceSize, [0, -offset, 0], { axis: [1, 0, 0], angle: 90 })); // Bottom
        return faces;
    }

    createCornerFaces(faceSize, offset, name = '', matProps = {}) {
        const corner = new THREE.Group();
        const borderOffset = offset - faceSize / 2;
        corner.add(this.createFace(faceSize, [borderOffset, borderOffset, offset], { axis: [0, 1, 0], angle: 0, matProps, name }));
        corner.add(this.createFace(faceSize, [offset, borderOffset, borderOffset], { axis: [0, 1, 0], angle: 90, matProps, name }));
        corner.add(this.createFace(faceSize, [borderOffset, offset, borderOffset], { axis: [1, 0, 0], angle: -90, matProps, name }));
        return corner;
    }

    createHorzEdgeFaces(w, h, offset, name = '', matProps = {}) {
        const edge = new THREE.Group();
        const borderOffset = offset - h / 2;
        edge.add(this.createFace([w, h], [0, borderOffset, offset], { axis: [0, 1, 0], angle: 0, name, matProps }));
        edge.add(this.createFace([w, h], [0, offset, borderOffset], { axis: [1, 0, 0], angle: -90, name, matProps }));
        return edge;
    }

    createVertEdgeFaces(w, h, offset, name = '', matProps = {}) {
        const edge = new THREE.Group();
        const borderOffset = offset - w / 2;
        edge.add(this.createFace([w, h], [borderOffset, 0, offset], { axis: [0, 1, 0], angle: 0, name, matProps }));
        edge.add(this.createFace([w, h], [offset, 0, borderOffset], { axis: [0, 1, 0], angle: 90, name, matProps }));
        return edge;
    }

    createCubeOutline(size) {
        const geometry = new THREE.BoxGeometry(size, size, size);
        const geo = new THREE.EdgesGeometry(geometry);
        const mat = new THREE.LineBasicMaterial({
            color: this._outlineColor,
            linewidth: 1
        });
        return new THREE.LineSegments(geo, mat);
    }

    createFaceMaterials(faceNames) {
        return [
            { name: FACES.FRONT, map: this.createTextTexture(faceNames.front) },
            { name: FACES.RIGHT, map: this.createTextTexture(faceNames.right) },
            { name: FACES.BACK, map: this.createTextTexture(faceNames.back) },
            { name: FACES.LEFT, map: this.createTextTexture(faceNames.left) },
            { name: FACES.TOP, map: this.createTextTexture(faceNames.top) },
            { name: FACES.BOTTOM, map: this.createTextTexture(faceNames.bottom) }
        ];
    }

    createTextTexture(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        
        // Background
        context.fillStyle = '#ffffff'; 
        context.fillRect(0, 0, 256, 256);
        
        // Text
        context.font = 'bold 64px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = COLORS.TEXT;
        context.fillText(text, 128, 128);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }
}

// Main Gizmo Class
export default class ViewCubeGizmo {
    constructor(camera, renderer, dimension = 80) {
        this.camera = camera;
        this.renderer = renderer;
        this.dimension = dimension;
        this.gizmoPos = ObjectPosition.RIGHT_BOTTOM; // Fixed to Bottom-Right

        this.scene = new THREE.Scene();
        this.gizmoCamera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0, 4);
        this.gizmoCamera.position.set(0, 0, 2);
        
        this.cube = new ViewCube(2, 0.2, true, COLORS.MAIN, COLORS.OUTLINE);
        this.scene.add(this.cube);
        
        // Add AxesHelper at the corner
        const axesSize = 2.5; 
        this.axesHelper = new THREE.AxesHelper(axesSize);
        // Position at bottom-left-back corner with offset
        // Cube is size 2 (extents -1 to 1). 
        // We place origin of axes at -1 (corner) minus a bit.
        this.axesHelper.position.set(-1.1, -1.1, -1.1);
        
        // Custom colors for better visibility if needed (default is RGB)
        this.cube.add(this.axesHelper);

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.hoveredObject = null;
        this.isTransitioning = false;
        
        // Bound listeners
        this.boundMouseMove = this.handleMouseMove.bind(this);
        this.boundClick = this.handleMouseClick.bind(this);
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        const dom = this.renderer.domElement;
        dom.addEventListener('mousemove', this.boundMouseMove);
        dom.addEventListener('click', this.boundClick);
    }

    dispose() {
        const dom = this.renderer.domElement;
        dom.removeEventListener('mousemove', this.boundMouseMove);
        dom.removeEventListener('click', this.boundClick);
        
        this.cube.dispose();
    }

    calculateViewportBbox() {
        const domElement = this.renderer.domElement;
        const canvasWidth = domElement.offsetWidth;
        const canvasHeight = domElement.offsetHeight;
        const length = this.dimension;
        
        // ObjectPosition.RIGHT_BOTTOM logic (DOM Coordinates: Y increases downwards)
        return new THREE.Box2(
            new THREE.Vector2(canvasWidth - length, canvasHeight - length),
            new THREE.Vector2(canvasWidth, canvasHeight)
        );
    }

    calculatePosInViewport(offsetX, offsetY, bbox) {
        // Convert mouse (DOM) to NDC (-1 to 1) within the gizmo viewport
        const x = ((offsetX - bbox.min.x) / this.dimension) * 2 - 1;
        const y = -((offsetY - bbox.min.y) / this.dimension) * 2 + 1; // Flip Y because DOM Y is down, GL Y is up
        return { x, y };
    }

    calculateViewportPos() {
        const domElement = this.renderer.domElement;
        const canvasWidth = domElement.offsetWidth;
        const canvasHeight = domElement.offsetHeight;
        const length = this.dimension;
        
        // ObjectPosition.RIGHT_BOTTOM logic for setViewport
        // Note: In this environment, viewport (0,0) appears to be top-left, 
        // so to put it at bottom, we need y = height - length.
        const x = canvasWidth - length;
        const y = canvasHeight - length; 
        
        return { x, y };
    }

    handleMouseMove(event) {
        if (this.isTransitioning) return;
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        // Mouse coordinates relative to canvas (DOM)
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;

        const bbox = this.calculateViewportBbox();
        
        if (bbox.containsPoint(new THREE.Vector2(offsetX, offsetY))) {
            const pos = this.calculatePosInViewport(offsetX, offsetY, bbox);
            this.checkSideOver(pos.x, pos.y);
        } else {
            this.resetHover();
        }
    }

    handleMouseClick(event) {
        if (this.isTransitioning) return;
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;

        const bbox = this.calculateViewportBbox();
        
        if (bbox.containsPoint(new THREE.Vector2(offsetX, offsetY))) {
            const pos = this.calculatePosInViewport(offsetX, offsetY, bbox);
            this.checkSideTouch(pos.x, pos.y);
        }
    }

    checkSideOver(x, y) {
        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.gizmoCamera);
        const intersects = this.raycaster.intersectObjects(this.cube.children, true);
        
        // Reset previous hover
        this.resetHover();

        if (intersects.length) {
            // Find the first object that has a name
            let object = null;
            for (const hit of intersects) {
                if (hit.object.name) {
                    object = hit.object;
                    break;
                }
            }

            if (object) {
                this.renderer.domElement.style.cursor = 'pointer';
                
                // Highlight logic
                const name = object.name;
                
                if (object.parent && object.parent !== this.cube) {
                     object.parent.children.forEach(child => {
                         if (child.name === name && child.isMesh) {
                             child.material.color.setHex(COLORS.HOVER);
                         }
                     });
                } else if (object.parent === this.cube) { // Should not happen for edges/corners but for faces if they were direct
                     // In this implementation faces are in a group too, so they fall in the first block
                     object.parent.children.forEach(child => {
                        if (child.name === name && child.isMesh) {
                            child.material.color.setHex(COLORS.HOVER);
                        }
                    });
                }

                this.hoveredObject = object; // Track for reset
                this.hoveredName = name; // Track name for group reset
            }
        }
    }

    resetHover() {
        if (this.hoveredName) {
            // Reset color of all meshes with the hovered name
            this.cube.traverse(child => {
                if (child.isMesh && child.name === this.hoveredName) {
                    child.material.color.setHex(COLORS.MAIN);
                }
            });
            this.renderer.domElement.style.cursor = 'default';
            this.hoveredObject = null;
            this.hoveredName = null;
        }
    }

    checkSideTouch(x, y) {
        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.gizmoCamera);
        const intersects = this.raycaster.intersectObjects(this.cube.children, true);
        
        if (intersects.length) {
            let object = null;
            for (const hit of intersects) {
                if (hit.object.name) {
                    object = hit.object;
                    break;
                }
            }

            if (object) {
                const quaternion = this.getRotation(object.name);
                const changeEvent = new CustomEvent('viewcube-change', { detail: { quaternion } });
                window.dispatchEvent(changeEvent);
            }
        }
    }

    update() {
        // Update orientation
        this.cube.quaternion.copy(this.camera.quaternion).invert();
        this.cube.updateMatrixWorld();

        // Render
        const autoClear = this.renderer.autoClear;
        this.renderer.autoClear = false;
        this.renderer.clearDepth();
        
        const pos = this.calculateViewportPos();
        this.renderer.setViewport(pos.x, pos.y, this.dimension, this.dimension);
        
        this.renderer.render(this.scene, this.gizmoCamera);
        
        // Restore viewport and clear state
        const domElement = this.renderer.domElement;
        this.renderer.setViewport(0, 0, domElement.offsetWidth, domElement.offsetHeight);
        this.renderer.autoClear = autoClear;
    }

    getRotation(side) {
        const q = new THREE.Quaternion();
        const e = new THREE.Euler();
        
        switch (side) {
            case FACES.FRONT: e.set(0, 0, 0); break;
            case FACES.RIGHT: e.set(0, Math.PI * 0.5, 0); break;
            case FACES.BACK: e.set(0, Math.PI, 0); break;
            case FACES.LEFT: e.set(0, -Math.PI * 0.5, 0); break;
            case FACES.TOP: e.set(-Math.PI * 0.5, 0, 0); break;
            case FACES.BOTTOM: e.set(Math.PI * 0.5, 0, 0); break;
            
            case FACES.TOP_FRONT_EDGE: e.set(-Math.PI * 0.25, 0, 0); break;
            case FACES.TOP_BACK_EDGE: e.set(-Math.PI * 0.25, Math.PI, 0, 'YXZ'); break;
            case FACES.BOTTOM_FRONT_EDGE: e.set(Math.PI * 0.25, 0, 0); break;
            case FACES.BOTTOM_BACK_EDGE: e.set(Math.PI * 0.25, Math.PI, 0, 'YXZ'); break;
            
            case FACES.FRONT_RIGHT_EDGE: e.set(0, Math.PI * 0.25, 0); break;
            case FACES.FRONT_LEFT_EDGE: e.set(0, -Math.PI * 0.25, 0); break;
            case FACES.BACK_RIGHT_EDGE: e.set(0, Math.PI * 0.75, 0); break;
            case FACES.BACK_LEFT_EDGE: e.set(0, -Math.PI * 0.75, 0); break;

            case FACES.TOP_RIGHT_EDGE: e.set(-Math.PI * 0.25, Math.PI * 0.5, 0, 'YXZ'); break;
            case FACES.TOP_LEFT_EDGE: e.set(-Math.PI * 0.25, -Math.PI * 0.5, 0, 'YXZ'); break;
            case FACES.BOTTOM_RIGHT_EDGE: e.set(Math.PI * 0.25, Math.PI * 0.5, 0, 'YXZ'); break;
            case FACES.BOTTOM_LEFT_EDGE: e.set(Math.PI * 0.25, -Math.PI * 0.5, 0, 'YXZ'); break;

            // Corners (Approximate angles for isometric views)
            case FACES.TOP_FRONT_RIGHT_CORNER: e.set(-Math.PI * 0.25, -Math.PI * 1.75, 0); break;
            case FACES.TOP_BACK_RIGHT_CORNER: e.set(Math.PI * 0.25, -Math.PI * 1.25, 0); break;
            case FACES.TOP_BACK_LEFT_CORNER: e.set(Math.PI * 0.25, -Math.PI * 0.75, 0); break;
            case FACES.TOP_FRONT_LEFT_CORNER: e.set(-Math.PI * 0.25, -Math.PI * 0.25, 0); break;
            
            case FACES.BOTTOM_FRONT_RIGHT_CORNER: e.set(Math.PI * 0.25, -Math.PI * 1.75, 0); break;
            case FACES.BOTTOM_BACK_RIGHT_CORNER: e.set(-Math.PI * 0.25, -Math.PI * 1.25, 0); break;
            case FACES.BOTTOM_BACK_LEFT_CORNER: e.set(-Math.PI * 0.25, -Math.PI * 0.75, 0); break;
            case FACES.BOTTOM_FRONT_LEFT_CORNER: e.set(Math.PI * 0.25, -Math.PI * 0.25, 0); break;
        }
        
        q.setFromEuler(e);
        return q;
    }
}
