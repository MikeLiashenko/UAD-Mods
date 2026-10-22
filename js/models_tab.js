// The "3D models" tab: the mod's own models (kept in the project, exported into the .uadmod as
// «name.uadmodel»), the 3D editor (editor3d.js), the parts list and the chosen part's properties.

import * as Ed from "./editor3d.js";

let T = {};
let lang = "uk";
let models = {};
let current = "";
let changed = () => {};
const $ = (s) => document.querySelector(s);
const r3 = (x) => Math.round(x * 1000) / 1000;
const name3 = (it) => (it ? it[lang] || it.en || it.id : "");

function save() {
	if (current && Ed.get()) models[current] = JSON.parse(JSON.stringify(Ed.get()));
	changed();
}

function uniqueName(base) {
	let n = base.replace(/[^a-z0-9_]/g, "_").replace(/^[^a-z]+/, "").slice(0, 24) || "model";
	if (!models[n]) return n;
	for (let i = 2; ; i++) if (!models[n + i]) return n + i;
}

function open(name) {
	save();
	current = name;
	$("#m-name-input").value = name;
	if (models[name]) Ed.load(models[name]);
	renderList();
	$("#m-editor").hidden = !current;
	$("#m-empty").hidden = !!current;
}

function renderList() {
	const box = $("#m-list");
	box.innerHTML = "";
	for (const n of Object.keys(models)) {
		const b = document.createElement("button");
		b.className = "btn small m-item" + (n === current ? " on" : "");
		b.textContent = (models[n].kind === "enemy" ? "🛩 " : "🛡 ") + n + ".uadmodel";
		b.addEventListener("click", () => open(n));
		box.append(b);
	}
	$("#m-name-input").disabled = !current;
	$("#m-delete").disabled = !current;
}

function create(kind, from) {
	const name = uniqueName(from || (kind === "enemy" ? "my_threat" : "my_system"));
	let m = Ed.starter(kind);
	if (from) {
		const src = (kind === "enemy" ? UAD_MODELS.enemies : UAD_MODELS.weapons)[from];
		if (src) m = Ed.clean(src, kind);
	}
	models[name] = m;
	open(name);
	changed();
}

// --- the panel ---------------------------------------------------------------------------------
function el(tag, cls, text) {
	const e = document.createElement(tag);
	if (cls) e.className = cls;
	if (text !== undefined) e.textContent = text;
	return e;
}

function select(options, value, cb) {
	const s = el("select");
	for (const [v, label] of options) {
		const o = el("option", "", label);
		o.value = v;
		if (v === value) o.selected = true;
		s.append(o);
	}
	s.addEventListener("change", () => cb(s.value));
	return s;
}

function row(label, control) {
	const r = el("label", "prop");
	r.append(el("span", "", label), control);
	return r;
}

function vec(label, values, step, cb) {
	const r = el("div", "prop vec");
	r.append(el("span", "", label));
	const g = el("div", "xyz");
	values.forEach((v, i) => {
		const inp = el("input");
		inp.type = "number";
		inp.step = step;
		inp.value = r3(v);
		inp.title = "XYZ"[i];
		inp.addEventListener("change", () => cb(i, parseFloat(inp.value) || 0));
		g.append(inp);
	});
	r.append(g);
	return r;
}

function shapeName(p) {
	return p.shape === "cylinder" && p.taper && +p.taper[1] === 0 ? T.m_cone : T["m_shape_" + p.shape];
}

function renderParts() {
	const m = Ed.get();
	const box = $("#m-parts");
	box.innerHTML = "";
	if (!m) return;
	m.parts.forEach((p, i) => {
		const b = el("button", "m-part" + (i === Ed.selectedIndex() ? " on" : ""), (i + 1) + ". " + shapeName(p) + " · " + T["m_group_" + p.group]);
		b.addEventListener("click", () => Ed.select(i));
		box.append(b);
	});
}

function renderProps(i) {
	const m = Ed.get();
	const box = $("#m-props");
	box.innerHTML = "";
	if (!m) return;
	if (i >= 0) {
		const p = m.parts[i];
		box.append(row(T.m_shape, select(Ed.LISTS.SHAPES.filter((s) => s !== "mesh" || p.shape === "mesh").map((s) => [s, T["m_shape_" + s]]), p.shape, (v) => Ed.setField("shape", v))));
		box.append(row(T.m_group, select(Ed.LISTS.GROUPS.map((g) => [g, T["m_group_" + g]]), p.group, (v) => Ed.setField("group", v))));
		const col = el("input");
		col.type = "color";
		col.value = p.color;
		col.addEventListener("change", () => Ed.setField("color", col.value));
		box.append(row(T.m_color, col));
		box.append(row(T.m_mat, select(Ed.LISTS.MATS.map((k) => [k, T["m_mat_" + k]]), p.mat, (v) => Ed.setField("mat", v))));
		box.append(vec(T.m_pos, p.pos, 0.05, (a, v) => Ed.setField("pos", v, a)));
		box.append(vec(T.m_rot, p.rot, 5, (a, v) => Ed.setField("rot", v, a)));
		box.append(vec(T.m_size, p.size, 0.05, (a, v) => Ed.setField("size", Math.max(0.005, v), a)));
		if (p.shape === "cylinder") box.append(vec(T.m_taper, [p.taper[0], p.taper[1], p.seg || 12], 0.05, (a, v) => {
			if (a === 2) Ed.setField("seg", Math.max(3, Math.min(32, Math.round(v))));
			else Ed.setField("taper", Math.max(0, Math.min(1, v)), a);
		}));
		if (p.shape === "prism") {
			const ap = el("input");
			ap.type = "number"; ap.step = 0.05; ap.min = 0; ap.max = 1; ap.value = p.apex;
			ap.addEventListener("change", () => Ed.setField("apex", Math.max(0, Math.min(1, +ap.value))));
			box.append(row(T.m_apex, ap));
		}
	} else {
		box.append(el("p", "note", T.m_none));
	}
	box.append(el("h4", "", T.m_pivots));
	const keys = m.kind === "weapon" ? ["turret", "gun", "muzzle", "spin"] : ["spin"];
	for (const k of keys) box.append(vec(T["m_pivot_" + k], m.pivots[k], 0.05, (a, v) => Ed.setPivot(k, a, v)));
	$("#m-kind").textContent = m.kind === "weapon" ? T.m_kind_weapon : T.m_kind_enemy;
}

function refreshOurs() {
	const s = $("#m-ours");
	s.innerHTML = "";
	const add = (label, list, kind) => {
		const g = el("optgroup");
		g.label = label;
		for (const it of list) {
			const o = el("option", "", name3(it));
			o.value = kind + ":" + it.id;
			g.append(o);
		}
		s.append(g);
	};
	add(T.cat_def, UAD_WEAPONS.filter((w) => UAD_MODELS.weapons[w.id]), "weapon");
	add(T.cat_enemy, UAD_ENEMIES.filter((e) => UAD_MODELS.enemies[e.id]), "enemy");
}

function relabel(texts, l) {
	T = texts;
	lang = l;
	refreshOurs();
	renderList();
	renderParts();
	renderProps(Ed.get() ? Ed.selectedIndex() : -1);
}

window.UAD_ModelsTab = {
	init(opts) {
		T = opts.texts;
		lang = opts.lang;
		models = opts.models || {};
		changed = opts.onChange || changed;
		Ed.init($("#m-canvas"), {
			onChange: () => { save(); renderParts(); renderProps(Ed.selectedIndex()); },
			onSelect: (i, live) => {
				if (live) { renderProps(i); return; } // the gizmo is moving: the numbers follow
				renderParts();
				renderProps(i);
			},
		});
		document.querySelectorAll("[data-shape]").forEach((b) => b.addEventListener("click", () => Ed.addPart(b.dataset.shape)));
		document.querySelectorAll("[data-gizmo]").forEach((b) => b.addEventListener("click", () => {
			Ed.mode(b.dataset.gizmo);
			document.querySelectorAll("[data-gizmo]").forEach((x) => x.classList.toggle("on", x === b));
		}));
		$("#m-undo").addEventListener("click", () => Ed.undo());
		$("#m-redo").addEventListener("click", () => Ed.redo());
		$("#m-copy").addEventListener("click", () => Ed.duplicate(false));
		$("#m-mirror").addEventListener("click", () => Ed.duplicate(true));
		$("#m-remove").addEventListener("click", () => Ed.remove());
		$("#m-frame").addEventListener("click", () => Ed.frame());
		$("#m-kind").addEventListener("click", () => Ed.setKind(Ed.get().kind === "weapon" ? "enemy" : "weapon"));
		$("#m-new-w").addEventListener("click", () => create("weapon"));
		$("#m-new-e").addEventListener("click", () => create("enemy"));
		$("#m-use-ours").addEventListener("click", () => {
			const [kind, id] = $("#m-ours").value.split(":");
			create(kind, id);
		});
		$("#m-name-input").addEventListener("change", () => {
			const n = uniqueName($("#m-name-input").value.toLowerCase());
			if (!current || n === current) { $("#m-name-input").value = current; return; }
			models[n] = models[current];
			delete models[current];
			current = n;
			$("#m-name-input").value = n;
			renderList();
			changed();
		});
		$("#m-delete").addEventListener("click", () => {
			if (!current || !confirm(T.m_confirm_delete)) return;
			delete models[current];
			current = "";
			const first = Object.keys(models)[0];
			if (first) open(first);
			else { renderList(); $("#m-editor").hidden = true; $("#m-empty").hidden = false; }
			changed();
		});
		relabel(T, lang);
		const first = Object.keys(models)[0];
		if (first) open(first);
		else { $("#m-editor").hidden = true; $("#m-empty").hidden = false; }
	},
	relabel,
	all() { save(); return models; },
	set(m) { models = m || {}; current = ""; const f = Object.keys(models)[0]; if (f) open(f); else { renderList(); $("#m-editor").hidden = true; $("#m-empty").hidden = false; } },
	show() { if (current) setTimeout(() => Ed.frame(), 50); },
};
