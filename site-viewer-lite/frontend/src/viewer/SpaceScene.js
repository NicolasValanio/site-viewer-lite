import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const LEVEL_COLORS = [0x2563eb, 0x16a34a, 0xd97706, 0x9333ea, 0xdc2626, 0x0891b2];

function disposeObject(object) {
  object.traverse((child) => {
    child.geometry?.dispose();

    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose());
    } else {
      child.material?.dispose();
    }
  });
}

export class SpaceScene {
  constructor(container, { onSelect } = {}) {
    this.container = container;
    this.onSelect = onSelect;
    this.activeLevel = 'all';
    this.selectedSpaceId = '';
    this.meshes = new Map();
    this.levelColors = new Map();
    this.pointCloud = null;
    this.spaceBounds = null;
    this.animationFrame = null;
    this.disposed = false;
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.pointerStart = null;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xeaf3fb);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
    this.camera.up.set(0, 0, 1);

    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = 'space-viewer-canvas';
    this.renderer.domElement.setAttribute('aria-label', 'Interactive 3D space viewer');
    this.container.replaceChildren(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = false;
    this.controls.screenSpacePanning = true;
    this.controls.touches.ONE = THREE.TOUCH.ROTATE;
    this.controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.addLights();
    this.addFloorReference();

    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.renderFrame = this.renderFrame.bind(this);
    this.requestRender = this.requestRender.bind(this);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
    this.controls.addEventListener('change', this.requestRender);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();
    this.requestRender();
  }

  addLights() {
    const ambient = new THREE.HemisphereLight(0xffffff, 0x3e5c76, 2.2);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(20, -15, 24);
    this.scene.add(keyLight);
  }

  addFloorReference() {
    this.grid = new THREE.GridHelper(40, 20, 0x9fb3c8, 0xcbd5e1);
    this.grid.rotation.x = Math.PI / 2;
    this.root.add(this.grid);

    this.axes = new THREE.AxesHelper(2.5);
    this.root.add(this.axes);
  }

  colorForLevel(level) {
    if (!this.levelColors.has(level)) {
      this.levelColors.set(level, LEVEL_COLORS[this.levelColors.size % LEVEL_COLORS.length]);
    }

    return this.levelColors.get(level);
  }

  setSpaces(spaces, levels = []) {
    this.clearSpaces();
    this.levelColors.clear();
    levels.forEach((level) => this.colorForLevel(level));

    if (!spaces.length) {
      return;
    }

    const bounds = new THREE.Box3();

    spaces.forEach((space) => {
      const geometry = new THREE.BoxGeometry(space.w, space.d, space.h);
      const material = new THREE.MeshStandardMaterial({
        color: this.colorForLevel(space.level),
        emissive: 0x000000,
        metalness: 0.05,
        opacity: 0.74,
        roughness: 0.7,
        transparent: true
      });
      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.set(space.x + space.w / 2, space.y + space.d / 2, space.z + space.h / 2);
      mesh.userData.space = space;
      this.root.add(mesh);
      this.meshes.set(space.id, mesh);
      bounds.expandByObject(mesh);
    });

    this.fitCamera(bounds);
    this.spaceBounds = bounds.clone();
    this.applyVisibility();
  }

  clearSpaces() {
    for (const mesh of this.meshes.values()) {
      this.root.remove(mesh);
      disposeObject(mesh);
    }

    this.meshes.clear();
    this.selectedSpaceId = '';
    this.spaceBounds = null;
  }

  setPointCloud({ colors, positions, spacing }) {
    this.clearPointCloud();

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute('color', new THREE.Uint8BufferAttribute(new Uint8Array(colors), 3, true));

    const material = new THREE.PointsMaterial({
      depthWrite: false,
      opacity: 0.82,
      size: Math.max(spacing || 0.02, 0.01),
      sizeAttenuation: true,
      transparent: true,
      vertexColors: true
    });

    this.pointCloud = new THREE.Points(geometry, material);
    if (this.spaceBounds) {
      const cloudBounds = this.spaceBounds.clone().expandByScalar(0.05);
      geometry.boundingSphere = cloudBounds.getBoundingSphere(new THREE.Sphere());
      this.pointCloud.frustumCulled = true;
    } else {
      this.pointCloud.frustumCulled = false;
    }
    this.root.add(this.pointCloud);
    this.requestRender();
  }

  clearPointCloud() {
    if (!this.pointCloud) {
      return;
    }

    this.root.remove(this.pointCloud);
    disposeObject(this.pointCloud);
    this.pointCloud = null;
    this.requestRender();
  }

  setLevelFilter(level) {
    this.activeLevel = level;
    const selectedMesh = this.meshes.get(this.selectedSpaceId);

    if (selectedMesh && !this.isMeshVisible(selectedMesh)) {
      this.setSelectedSpace('', true);
    } else {
      this.applyVisibility();
    }
  }

  isMeshVisible(mesh) {
    return this.activeLevel === 'all' || mesh.userData.space.level === this.activeLevel;
  }

  applyVisibility() {
    for (const mesh of this.meshes.values()) {
      const selected = mesh.userData.space.id === this.selectedSpaceId;
      mesh.visible = this.isMeshVisible(mesh);
      mesh.material.opacity = selected ? 0.98 : 0.74;
      mesh.material.emissive.setHex(selected ? 0x3b82f6 : 0x000000);
      mesh.material.emissiveIntensity = selected ? 0.35 : 0;
    }

    this.requestRender();
  }

  setSelectedSpace(spaceId, emitSelection = false) {
    const selectedMesh = this.meshes.get(spaceId);
    this.selectedSpaceId = selectedMesh && this.isMeshVisible(selectedMesh) ? spaceId : '';
    this.applyVisibility();

    if (emitSelection) {
      this.onSelect?.(this.selectedSpaceId);
    }
  }

  fitCamera(bounds) {
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const largestDimension = Math.max(size.x, size.y, size.z, 1);
    const distance = largestDimension * 1.8;

    this.camera.near = Math.max(largestDimension / 1000, 0.01);
    this.camera.far = largestDimension * 100;
    this.camera.position.set(center.x + distance, center.y - distance, center.z + distance * 0.85);
    this.controls.target.copy(center);
    this.camera.updateProjectionMatrix();
    this.controls.update();

    this.grid.scale.setScalar(Math.max(largestDimension / 20, 0.5));
  }

  handlePointerDown(event) {
    this.pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }

  handlePointerUp(event) {
    if (!this.pointerStart || this.pointerStart.id !== event.pointerId) {
      return;
    }

    const distance = Math.hypot(event.clientX - this.pointerStart.x, event.clientY - this.pointerStart.y);
    this.pointerStart = null;

    if (distance > 7) {
      return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const intersection = this.raycaster.intersectObjects([...this.meshes.values()].filter((mesh) => mesh.visible), false)[0];
    this.setSelectedSpace(intersection?.object.userData.space.id || '', true);
  }

  resize() {
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.requestRender();
  }

  requestRender() {
    if (!this.disposed && this.animationFrame === null) {
      this.animationFrame = window.requestAnimationFrame(this.renderFrame);
    }
  }

  renderFrame() {
    this.animationFrame = null;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;

    if (this.animationFrame !== null) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.controls.removeEventListener('change', this.requestRender);
    this.clearPointCloud();
    this.clearSpaces();
    disposeObject(this.grid);
    disposeObject(this.axes);
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
