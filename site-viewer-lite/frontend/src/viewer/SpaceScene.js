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
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.pointerStart = null;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xeaf3fb);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
    this.camera.up.set(0, 0, 1);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = 'space-viewer-canvas';
    this.renderer.domElement.setAttribute('aria-label', 'Interactive 3D space viewer');
    this.container.replaceChildren(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = true;
    this.controls.touches.ONE = THREE.TOUCH.ROTATE;
    this.controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.addLights();
    this.addFloorReference();

    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();
    this.animate();
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
    this.applyVisibility();
  }

  clearSpaces() {
    for (const mesh of this.meshes.values()) {
      this.root.remove(mesh);
      disposeObject(mesh);
    }

    this.meshes.clear();
    this.selectedSpaceId = '';
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
  }

  animate() {
    this.animationFrame = window.requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.clearSpaces();
    disposeObject(this.grid);
    disposeObject(this.axes);
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
