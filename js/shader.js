// The "Picture" tab: effects with sliders make a Godot canvas_item shader for the game (.uadshader)
// and the same statements in GLSL ES 3.00 draw the live preview on a screenshot of the game.

(function () {
	"use strict";

	// [key, uniforms [[name, min, max, default]], statements]. The statements are shared by the game's
	// shader and the preview: c is the colour, uv the screen position, l() the brightness.
	const FX = [
		["contrast", [["contrast", 0.5, 2.0, 1.15], ["bright", -0.4, 0.4, 0.0]], "c = (c - 0.5) * contrast + 0.5 + bright;"],
		["sat", [["sat", 0.0, 2.0, 1.3]], "c = mix(vec3(l(c)), c, sat);"],
		["grey", [["grey", 0.0, 1.0, 1.0]], "c = mix(c, vec3(l(c)), grey);"],
		["sepia", [["sepia", 0.0, 1.0, 0.8]], "c = mix(c, vec3(dot(c, vec3(0.393, 0.769, 0.189)), dot(c, vec3(0.349, 0.686, 0.168)), dot(c, vec3(0.272, 0.534, 0.131))), sepia);"],
		["nv", [["nv", 0.0, 1.0, 0.85]], "c = mix(c, vec3(0.15, 1.0, 0.35) * pow(l(c), 0.6) * 1.4, nv * NV_NIGHT);"],
		["tint", [["tint_amount", 0.0, 1.0, 0.4]], "c = mix(c, c * tint_color * 1.6, tint_amount);"],
		["grain", [["grain", 0.0, 0.3, 0.08]], "c += (fract(sin(dot(uv * 1000.0 + fract(TIME), vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * grain;"],
		["lines", [["lines", 0.0, 0.5, 0.15]], "c *= 1.0 - lines * (0.5 + 0.5 * sin(uv.y * 900.0));"],
		["vignette", [["vignette", 0.0, 1.0, 0.7]], "c *= mix(1.0, smoothstep(0.85, 0.3, length(uv - 0.5)), vignette);"],
		["alarm", [], "c = mix(c, c * vec3(1.35, 0.6, 0.55), uad_alarm * (0.5 + 0.5 * sin(TIME * 4.0)) * 0.6);"],
	];
	const LABEL = { contrast: "fx_contrast", sat: "fx_sat", grey: "fx_grey", sepia: "fx_sepia", nv: "fx_nv", tint: "fx_tint",
		grain: "fx_grain", lines: "fx_lines", vignette: "fx_vignette", alarm: "fx_alarm", bright: "fx_bright" };

	let T = {};
	let state = { on: { nv: true, grain: true, vignette: true }, v: {}, tint: "#ff9a3d", nv_night: true, night: 1, alarm: 0 };
	let onChange = () => {};
	let gl = null, prog = null, tex = null, raf = 0, compiledFor = "", imgReady = false, t0 = performance.now();

	FX.forEach(([, us]) => us.forEach(([n, , , d]) => { state.v[n] = d; }));

	const f = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(Math.round(x * 1000) / 1000));
	const hex3 = (h) => {
		const n = parseInt(h.slice(1), 16);
		return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
	};

	function body() {
		const lines = [];
		for (const [key, , st] of FX) {
			if (!state.on[key]) continue;
			lines.push("\t" + st.replace("NV_NIGHT", state.nv_night ? "mix(0.35, 1.0, uad_night)" : "1.0"));
		}
		return lines;
	}

	function uniforms(game) {
		const out = [];
		for (const [key, us] of FX) {
			if (!state.on[key]) continue;
			for (const [n, lo, hi] of us) {
				out.push(game ? "uniform float " + n + " : hint_range(" + f(lo) + ", " + f(hi) + ") = " + f(state.v[n]) + ";" : "uniform float " + n + ";");
			}
			if (key === "tint") {
				const c = hex3(state.tint).map(f).join(", ");
				out.push(game ? "uniform vec3 tint_color : source_color = vec3(" + c + ");" : "uniform vec3 tint_color;");
			}
		}
		return out;
	}

	// the game's shader: what the .uadshader file holds
	function godot(name, desc) {
		return ["// name: " + (name || "Picture"), "// description: " + (desc || ""), "shader_type canvas_item;", "",
			"uniform sampler2D screen : hint_screen_texture, filter_linear;"].concat(uniforms(true), [
			"uniform float uad_night = 0.0;", "uniform float uad_alarm = 0.0;", "",
			"float l(vec3 c) {", "\treturn dot(c, vec3(0.299, 0.587, 0.114));", "}", "",
			"void fragment() {", "\tvec2 uv = SCREEN_UV;", "\tvec3 c = texture(screen, uv).rgb;"], body(), ["\tCOLOR = vec4(c, 1.0);", "}", ""]).join("\n");
	}

	function glsl() {
		return ["#version 300 es", "precision highp float;", "uniform sampler2D screen;", "uniform float TIME;",
			"uniform float uad_night;", "uniform float uad_alarm;", "in vec2 v_uv;", "out vec4 outColor;"].concat(uniforms(false), [
			"float l(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }",
			"void main() {", "\tvec2 uv = v_uv;", "\tvec3 c = texture(screen, uv).rgb;"], body(), ["\toutColor = vec4(c, 1.0);", "}"]).join("\n");
	}

	// --- preview -----------------------------------------------------------------------------------
	function initGL(canvas, note) {
		gl = canvas.getContext("webgl2", { preserveDrawingBuffer: false });
		if (!gl) {
			note.hidden = false;
			return;
		}
		const buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
		tex = gl.createTexture();
		const img = new Image();
		img.onload = () => {
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			imgReady = true;
		};
		img.src = "img/preview.webp";
		const loop = () => {
			draw();
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
	}

	function compile() {
		const src = glsl();
		if (src === compiledFor && prog) return;
		compiledFor = src;
		const sh = (type, s) => {
			const o = gl.createShader(type);
			gl.shaderSource(o, s);
			gl.compileShader(o);
			if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(o));
			return o;
		};
		const p = gl.createProgram();
		gl.attachShader(p, sh(gl.VERTEX_SHADER, "#version 300 es\nin vec2 pos;\nout vec2 v_uv;\nvoid main() { v_uv = pos * 0.5 + 0.5; gl_Position = vec4(pos, 0.0, 1.0); }"));
		gl.attachShader(p, sh(gl.FRAGMENT_SHADER, src));
		gl.linkProgram(p);
		if (prog) gl.deleteProgram(prog);
		prog = p;
	}

	function draw() {
		if (!gl || !imgReady) return;
		const c = gl.canvas;
		const w = Math.round(c.clientWidth * devicePixelRatio), h = Math.round(c.clientHeight * devicePixelRatio);
		if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
		compile();
		gl.viewport(0, 0, c.width, c.height);
		gl.useProgram(prog);
		const loc = gl.getAttribLocation(prog, "pos");
		gl.enableVertexAttribArray(loc);
		gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
		const u = (n) => gl.getUniformLocation(prog, n);
		gl.uniform1f(u("TIME"), (performance.now() - t0) / 1000);
		gl.uniform1f(u("uad_night"), state.night);
		gl.uniform1f(u("uad_alarm"), state.alarm);
		for (const n in state.v) gl.uniform1f(u(n), state.v[n]);
		gl.uniform3fv(u("tint_color"), hex3(state.tint));
		gl.uniform1i(u("screen"), 0);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	// --- controls ----------------------------------------------------------------------------------
	function build(box) {
		box.innerHTML = "";
		for (const [key, us] of FX) {
			const row = document.createElement("div");
			row.className = "fx" + (state.on[key] ? " on" : "");
			const lab = document.createElement("label");
			lab.className = "fx-head";
			const cb = document.createElement("input");
			cb.type = "checkbox";
			cb.checked = !!state.on[key];
			cb.addEventListener("change", () => { state.on[key] = cb.checked; row.classList.toggle("on", cb.checked); changed(); });
			lab.append(cb, document.createTextNode(" " + T[LABEL[key]]));
			row.append(lab);
			for (const [n, lo, hi] of us) {
				const s = document.createElement("label");
				s.className = "fx-slider";
				const r = document.createElement("input");
				r.type = "range";
				r.min = lo; r.max = hi; r.step = (hi - lo) / 100;
				r.value = state.v[n];
				const out = document.createElement("output");
				out.textContent = (+state.v[n]).toFixed(2);
				r.addEventListener("input", () => { state.v[n] = +r.value; out.textContent = (+r.value).toFixed(2); changed(); });
				if (us.length > 1) s.append(document.createTextNode(T[LABEL[n]] || n));
				s.append(r, out);
				row.append(s);
			}
			if (key === "tint") {
				const c = document.createElement("input");
				c.type = "color";
				c.value = state.tint;
				c.addEventListener("input", () => { state.tint = c.value; changed(); });
				row.append(c);
			}
			if (key === "nv") {
				const l2 = document.createElement("label");
				l2.className = "fx-opt";
				const c2 = document.createElement("input");
				c2.type = "checkbox";
				c2.checked = state.nv_night;
				c2.addEventListener("change", () => { state.nv_night = c2.checked; changed(); });
				l2.append(c2, document.createTextNode(" " + T.fx_nv_night));
				row.append(l2);
			}
			box.append(row);
		}
	}

	function changed() {
		onChange();
	}

	window.UAD_Picture = {
		init(opts) {
			T = opts.texts;
			if (opts.state) state = Object.assign(state, opts.state);
			onChange = opts.onChange || onChange;
			build(opts.controls);
			if (!gl) initGL(opts.canvas, opts.note);
		},
		relabel(texts, box) {
			T = texts;
			build(box);
		},
		setPreview(night, alarm) {
			state.night = night ? 1 : 0;
			state.alarm = alarm ? 1 : 0;
		},
		any() { return Object.values(state.on).some((x) => x); },
		state() { return state; },
		code: godot,
	};
})();
