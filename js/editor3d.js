// The site's 3D model editor (three.js): the same «.uadmodel» format the game builds
// (scripts/mods/model3d.gd of the game). Every part is a unit shape scaled to its size, so the
// scale gizmo edits the size directly; parts hang from their group's pivot (turret, gun, spin)
// as in the game. Godot and three.js agree on Y up, forward -Z and the Y-X-Z order of turns.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";

const DEG = Math.PI / 180;
const PIVOTS = { turret: [0, 1.6, 0], gun: [0, 0.6, 0], muzzle: [0, 0, -2], spin: [0, 0, 1] };
const SHAPES = ["box", "cylinder", "sphere", "prism", "mesh"];
const GROUPS = ["body", "turret", "gun", "spin"];
const MATS = ["paint", "solid", "metal", "glass", "glow"];

let renderer, scene, camera, orbit, gizmo, root, groups = {}, markers = {}, holder;
let model = null, selected = -1, meshes = [], onChange = () => {}, onSelect = () => {};
let undoStack = [], redoStack = [];
const geoCache = {};

// --- shapes ------------------------------------------------------------------------------------
function unitGeometry(p) {
	if (p.shape === "box") return geoCache.box || (geoCache.box = new THREE.BoxGeometry(1, 1, 1));
	if (p.shape === "sphere") return geoCache.sphere || (geoCache.sphere = new THREE.SphereGeometry(0.5, 20, 12));
	if (p.shape === "cylinder") {
		const t = p.taper || [1, 1];
		const key = "cyl" + t[0] + "_" + t[1] + "_" + (p.seg || 12);
		return geoCache[key] || (geoCache[key] = new THREE.CylinderGeometry(0.5 * t[1], 0.5 * t[0], 1, p.seg || 12));
	}
	if (p.shape === "prism") {
		// Godot's PrismMesh: a triangle in X-Y (apex at the top, at "apex" across) drawn out along Z
		const a = (p.apex === undefined ? 0.5 : p.apex) - 0.5;
		const key = "prism" + a;
		if (geoCache[key]) return geoCache[key];
		const v = [[-0.5, -0.5], [0.5, -0.5], [a, 0.5]];
		const pos = [];
		const tri = (i, j, k, z) => { for (const n of [i, j, k]) pos.push(v[n][0], v[n][1], z); };
		tri(0, 1, 2, 0.5); tri(0, 2, 1, -0.5);
		for (let i = 0; i < 3; i++) {
			const j = (i + 1) % 3;
			pos.push(v[i][0], v[i][1], 0.5, v[i][0], v[i][1], -0.5, v[j][0], v[j][1], -0.5);
			pos.push(v[i][0], v[i][1], 0.5, v[j][0], v[j][1], -0.5, v[j][0], v[j][1], 0.5);
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
		g.computeVertexNormals();
		return (geoCache[key] = g);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(p.tris || [], 3));
	g.computeVertexNormals();
	return g;
}

const matCache = {};
function material(p) {
	const key = p.color + p.mat;
	if (matCache[key]) return matCache[key];
	const c = new THREE.Color(p.color || "#808080");
	const o = { color: c, roughness: 0.75, metalness: 0.1, side: THREE.DoubleSide };
	if (p.mat === "solid") o.roughness = 0.85;
	if (p.mat === "metal") { o.roughness = 0.38; o.metalness = 0.75; }
	if (p.mat === "glass") { o.roughness = 0.06; o.metalness = 0.3; o.transparent = true; o.opacity = 0.75; }
	if (p.mat === "glow") { o.emissive = c; o.emissiveIntensity = 1.4; }
	const m = new THREE.MeshStandardMaterial(o);
	return (matCache[key] = m);
}

// --- scene -------------------------------------------------------------------------------------
export function init(canvas, opts) {
	onChange = opts.onChange || onChange;
	onSelect = opts.onSelect || onSelect;
	renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
	renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
	scene = new THREE.Scene();
	scene.background = new THREE.Color("#07120f");
	camera = new THREE.PerspectiveCamera(45, 1, 0.05, 800);
	camera.position.set(9, 6, 10);
	scene.add(new THREE.HemisphereLight("#cfe8dc", "#1d2a24", 1.0));
	const sun = new THREE.DirectionalLight("#ffffff", 1.6);
	sun.position.set(6, 10, 4);
	scene.add(sun);
	const grid = new THREE.GridHelper(20, 20, "#2fbf88", "#16483a");
	scene.add(grid);
	const fwd = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.01, 0), new THREE.Vector3(0, 0.01, -10)]),
		new THREE.LineBasicMaterial({ color: "#ff6650" }));
	scene.add(fwd);
	// a man beside the model, for the scale
	const man = new THREE.Group();
	const grey = new THREE.MeshStandardMaterial({ color: "#a6aba6", roughness: 0.9 });
	const part = (w, h, d, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), grey); m.position.set(x, y, 0); man.add(m); };
	part(0.42, 0.62, 0.24, 0, 1.2); part(0.24, 0.26, 0.24, 0, 1.68); part(0.16, 0.86, 0.18, -0.11, 0.43); part(0.16, 0.86, 0.18, 0.11, 0.43);
	man.position.set(3.5, 0, 1.5);
	scene.add(man);
	holder = new THREE.Group();
	scene.add(holder);
	for (const [k, col] of [["turret", "#ffcc33"], ["gun", "#4dd8ff"], ["muzzle", "#ff4d4d"], ["spin", "#ff66ff"]]) {
		const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: col, depthTest: false }));
		m.renderOrder = 10;
		scene.add(m);
		markers[k] = m;
	}
	orbit = new OrbitControls(camera, canvas);
	orbit.enableDamping = true;
	orbit.target.set(0, 1.5, 0);
	gizmo = new TransformControls(camera, canvas);
	gizmo.setSize(0.9);
	gizmo.addEventListener("dragging-changed", (e) => {
		orbit.enabled = !e.value;
		if (e.value) snapshot();
		else { readBack(); onChange(); }
	});
	gizmo.addEventListener("objectChange", () => { readBack(); onSelect(selected, true); });
	scene.add(gizmo);
	// a tap (not a drag) picks a part
	let down = null;
	canvas.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; });
	canvas.addEventListener("pointerup", (e) => {
		if (!down || gizmo.dragging) return;
		if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
		const r = canvas.getBoundingClientRect();
		const ray = new THREE.Raycaster();
		ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
		const hit = ray.intersectObjects(meshes, false)[0];
		select(hit ? meshes.indexOf(hit.object) : -1);
	});
	const loop = () => {
		resize();
		orbit.update();
		renderer.render(scene, camera);
		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);
}

function resize() {
	const c = renderer.domElement;
	const w = c.clientWidth, h = c.clientHeight;
	if (!w || !h) return;
	if (c.width !== Math.round(w * renderer.getPixelRatio()) || c.height !== Math.round(h * renderer.getPixelRatio())) {
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
	}
}

const v3 = (a) => new THREE.Vector3(+a[0], +a[1], +a[2]);

function rebuild() {
	gizmo.detach();
	holder.clear();
	meshes = [];
	if (!model) return;
	const pv = model.pivots;
	root = new THREE.Group();
	holder.add(root);
	groups = { body: root };
	if (model.kind === "weapon") {
		groups.turret = new THREE.Group(); groups.turret.position.copy(v3(pv.turret)); root.add(groups.turret);
		groups.gun = new THREE.Group(); groups.gun.position.copy(v3(pv.gun)); groups.turret.add(groups.gun);
	}
	groups.spin = new THREE.Group(); groups.spin.position.copy(v3(pv.spin)); root.add(groups.spin);
	for (const p of model.parts) {
		const m = new THREE.Mesh(unitGeometry(p), material(p));
		m.position.copy(v3(p.pos));
		m.rotation.set(p.rot[0] * DEG, p.rot[1] * DEG, p.rot[2] * DEG, "YXZ");
		m.scale.copy(v3(p.size));
		(groups[p.group] || root).add(m);
		meshes.push(m);
	}
	markers.turret.position.copy(v3(pv.turret));
	markers.gun.position.copy(v3(pv.turret).add(v3(pv.gun)));
	markers.muzzle.position.copy(v3(pv.turret).add(v3(pv.gun)).add(v3(pv.muzzle)));
	markers.spin.position.copy(v3(pv.spin));
	for (const k of ["turret", "gun", "muzzle"]) markers[k].visible = model.kind === "weapon";
	markers.spin.visible = model.parts.some((p) => p.group === "spin");
	if (selected >= 0 && meshes[selected]) gizmo.attach(meshes[selected]);
}

const r3 = (x) => Math.round(x * 1000) / 1000;

// the gizmo moved a part: its numbers again
function readBack() {
	if (selected < 0 || !meshes[selected]) return;
	const m = meshes[selected], p = model.parts[selected];
	p.pos = [r3(m.position.x), r3(m.position.y), r3(m.position.z)];
	const e = new THREE.Euler().setFromQuaternion(m.quaternion, "YXZ");
	p.rot = [r3(e.x / DEG), r3(e.y / DEG), r3(e.z / DEG)];
	p.size = [r3(Math.max(0.005, Math.abs(m.scale.x))), r3(Math.max(0.005, Math.abs(m.scale.y))), r3(Math.max(0.005, Math.abs(m.scale.z)))];
}

// --- the model ---------------------------------------------------------------------------------
export function starter(kind) {
	if (kind === "enemy") return { uad_model: 1, kind: "enemy", name: "", pivots: { ...clone(PIVOTS), spin: [0, 0, 1.65] }, parts: [
		{ shape: "cylinder", group: "body", pos: [0, 0, 0], rot: [90, 0, 0], size: [0.6, 3.2, 0.6], taper: [1, 0.6], seg: 12, color: "#5a5f63", mat: "paint" },
		{ shape: "prism", group: "body", pos: [0, 0, 0.3], rot: [-90, 0, 0], size: [2.6, 1.6, 0.08], apex: 0.5, color: "#4d5256", mat: "paint" },
		{ shape: "box", group: "spin", pos: [0, 0, 0], rot: [0, 0, 0], size: [1.2, 0.08, 0.05], color: "#202020", mat: "solid" },
	] };
	return { uad_model: 1, kind: "weapon", name: "", pivots: { ...clone(PIVOTS), turret: [0, 1.4, 0], gun: [0, 0.7, 0], muzzle: [0, 0, -1.8] }, parts: [
		{ shape: "box", group: "body", pos: [0, 0.9, 0], rot: [0, 0, 0], size: [2.6, 1, 5.2], color: "#4f5a35", mat: "paint" },
		{ shape: "cylinder", group: "turret", pos: [0, 0.25, 0], rot: [0, 0, 0], size: [1.6, 0.5, 1.6], taper: [1, 1], seg: 12, color: "#4f5a35", mat: "paint" },
		{ shape: "box", group: "gun", pos: [0, 0, -0.6], rot: [0, 0, 0], size: [0.8, 0.6, 2], color: "#3d4428", mat: "paint" },
	] };
}

const clone = (x) => JSON.parse(JSON.stringify(x));

// a model checked the way the game checks it (shapes, groups, materials, limits)
export function clean(d, kind) {
	const m = { uad_model: 1, kind: (kind || d.kind) === "enemy" ? "enemy" : "weapon", name: String(d.name || "").slice(0, 48), pivots: {}, parts: [] };
	for (const k in PIVOTS) m.pivots[k] = Array.isArray(d.pivots && d.pivots[k]) ? d.pivots[k].map(Number) : PIVOTS[k].slice();
	for (const p of (d.parts || []).slice(0, 400)) {
		const q = { shape: SHAPES.includes(p.shape) ? p.shape : "box", group: GROUPS.includes(p.group) ? p.group : "body",
			pos: (p.pos || [0, 0, 0]).map(Number), rot: (p.rot || [0, 0, 0]).map(Number), size: (p.size || [1, 1, 1]).map((x) => Math.max(0.005, +x)),
			color: /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : "#808080", mat: MATS.includes(p.mat) ? p.mat : "paint" };
		if (q.shape === "cylinder") { q.taper = p.taper || [1, 1]; q.seg = p.seg || 12; }
		if (q.shape === "prism") q.apex = p.apex === undefined ? 0.5 : +p.apex;
		if (q.shape === "mesh") q.tris = p.tris || [];
		m.parts.push(q);
	}
	return m;
}

export function load(d) {
	model = clean(d);
	selected = -1;
	undoStack = [];
	redoStack = [];
	rebuild();
	frame();
	onSelect(-1);
}

export function get() { return model; }

export function frame() {
	if (!model) return;
	const box = new THREE.Box3().setFromObject(holder);
	if (box.isEmpty()) return;
	const c = box.getCenter(new THREE.Vector3());
	const size = box.getSize(new THREE.Vector3()).length();
	orbit.target.copy(c);
	camera.position.copy(c).add(new THREE.Vector3(0.75, 0.5, 0.85).normalize().multiplyScalar(Math.max(size * 1.3, 3)));
}

function snapshot() {
	undoStack.push(JSON.stringify(model));
	if (undoStack.length > 80) undoStack.shift();
	redoStack = [];
}

export function undo() {
	if (!undoStack.length) return;
	redoStack.push(JSON.stringify(model));
	model = JSON.parse(undoStack.pop());
	selected = Math.min(selected, model.parts.length - 1);
	rebuild(); onSelect(selected); onChange();
}

export function redo() {
	if (!redoStack.length) return;
	undoStack.push(JSON.stringify(model));
	model = JSON.parse(redoStack.pop());
	selected = Math.min(selected, model.parts.length - 1);
	rebuild(); onSelect(selected); onChange();
}

export function select(i) {
	selected = i >= 0 && i < model.parts.length ? i : -1;
	gizmo.detach();
	if (selected >= 0) gizmo.attach(meshes[selected]);
	onSelect(selected);
}

export function selectedIndex() { return selected; }

export function mode(m) { gizmo.setMode(m); }

export function addPart(shape) {
	if (!model || model.parts.length >= 400) return;
	snapshot();
	const t = orbit.target;
	const p = { shape: shape === "cone" ? "cylinder" : shape, group: "body", pos: [r3(t.x), r3(t.y), r3(t.z)], rot: [0, 0, 0], size: [1, 1, 1], color: "#6b7350", mat: "paint" };
	if (shape === "cylinder") { p.taper = [1, 1]; p.seg = 12; }
	if (shape === "cone") { p.taper = [1, 0]; p.seg = 12; }
	if (shape === "prism") p.apex = 0.5;
	if (selected >= 0) {
		const s = model.parts[selected];
		p.group = s.group;
		p.pos = [r3(s.pos[0] + s.size[0] / 2 + 0.6), s.pos[1], s.pos[2]];
	}
	model.parts.push(p);
	selected = model.parts.length - 1;
	rebuild(); onSelect(selected); onChange();
}

export function setField(key, value, index) {
	if (selected < 0) return;
	snapshot();
	const p = model.parts[selected];
	if (index === undefined) p[key] = value;
	else p[key][index] = value;
	if (key === "shape") {
		if (value === "cylinder" && !p.taper) { p.taper = [1, 1]; p.seg = 12; }
		if (value === "prism" && p.apex === undefined) p.apex = 0.5;
		if (value === "mesh" && !p.tris) p.shape = "box";
	}
	rebuild(); onChange();
}

export function setPivot(k, axis, value) {
	snapshot();
	model.pivots[k][axis] = value;
	rebuild(); onChange();
}

export function setKind(kind) {
	snapshot();
	model.kind = kind;
	rebuild(); onSelect(selected); onChange();
}

export function duplicate(mirror) {
	if (selected < 0 || model.parts.length >= 400) return;
	snapshot();
	const p = clone(model.parts[selected]);
	if (mirror) {
		p.pos[0] = -p.pos[0]; p.rot[1] = -p.rot[1]; p.rot[2] = -p.rot[2];
		if (p.shape === "prism") p.apex = 1 - p.apex;
		if (p.shape === "mesh") {
			for (let i = 0; i + 8 < p.tris.length; i += 9) {
				for (let k = 0; k < 3; k++) p.tris[i + k * 3] = -p.tris[i + k * 3];
				for (let k = 0; k < 3; k++) { const t = p.tris[i + 3 + k]; p.tris[i + 3 + k] = p.tris[i + 6 + k]; p.tris[i + 6 + k] = t; }
			}
		}
	} else p.pos[0] = r3(p.pos[0] + 0.3);
	model.parts.push(p);
	selected = model.parts.length - 1;
	rebuild(); onSelect(selected); onChange();
}

export function remove() {
	if (selected < 0) return;
	snapshot();
	model.parts.splice(selected, 1);
	selected = -1;
	rebuild(); onSelect(-1); onChange();
}

export const LISTS = { SHAPES, GROUPS, MATS };
