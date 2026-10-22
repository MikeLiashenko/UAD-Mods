// The mod maker page: language, tabs, the blocks workspace, the code editor, the 3D models and the
// picture tabs, the project kept in the browser, examples, and the .uadmod file (a zip: mod.json,
// main.py, the models as «name.uadmodel», and the blocks themselves in blocks.json so the site can
// open the mod again; the game does not read that one).

(function () {
	"use strict";

	const BLOCKLY_MSG = "https://unpkg.com/blockly@11.2.1/msg/";
	const KEY = "uadmods-project";
	const $ = (s) => document.querySelector(s);

	let lang = "uk";
	let T = UAD_T.uk;
	let ws = null;
	let cm = null;
	let detached = false;
	let manualCode = "";
	let saveTimer = 0;
	let tab = "blocks";

	// --- language -------------------------------------------------------------------------------
	function pickLang() {
		try { const s = localStorage.getItem("uad-lang"); if (s && UAD_T[s]) return s; } catch (e) {}
		const n = (navigator.language || "").toLowerCase();
		return n.startsWith("ru") ? "ru" : n.startsWith("en") ? "en" : "uk";
	}

	function t(k) { return (UAD_T[lang] && UAD_T[lang][k] !== undefined) ? UAD_T[lang][k] : UAD_T.en[k]; }

	function loadMsg(l) {
		return new Promise((ok) => {
			const s = document.createElement("script");
			s.src = BLOCKLY_MSG + l + ".js";
			s.onload = ok;
			s.onerror = ok;
			document.head.append(s);
		});
	}

	async function setLang(l) {
		lang = l;
		T = Object.assign({}, UAD_T.en, UAD_T[l]);
		try { localStorage.setItem("uad-lang", l); } catch (e) {}
		document.documentElement.lang = l;
		document.querySelectorAll(".lang button").forEach((b) => b.classList.toggle("on", b.dataset.lang === l));
		document.querySelectorAll("[data-t]").forEach((el) => { el.textContent = t(el.dataset.t); });
		document.querySelectorAll("[data-ph]").forEach((el) => { el.placeholder = t(el.dataset.ph); });
		document.title = t("title") + " · Ukraine Air Defense";
		const steps = $("#help-steps");
		steps.innerHTML = "";
		for (const s of t("help_steps")) {
			const li = document.createElement("li");
			li.textContent = s;
			steps.append(li);
		}
		await loadMsg(l);
		const saved = ws ? Blockly.serialization.workspaces.save(ws) : readProject().blocks;
		UAD_Blocks.setup(T, l);
		if (ws) ws.dispose();
		ws = Blockly.inject("blockly", {
			toolbox: UAD_Blocks.toolbox(),
			renderer: "zelos",
			theme: Blockly.Theme.defineTheme("uad-" + l, {
				base: Blockly.Themes.Classic,
				componentStyles: {
					workspaceBackgroundColour: "#06110e", toolboxBackgroundColour: "#0a1c16", toolboxForegroundColour: "#ecfff6",
					flyoutBackgroundColour: "#0d2a20", flyoutForegroundColour: "#ecfff6", flyoutOpacity: 0.96,
					scrollbarColour: "#3dffb0", scrollbarOpacity: 0.35, insertionMarkerColour: "#ffffff", cursorColour: "#3dffb0",
				},
				fontStyle: { family: "Manrope, system-ui, sans-serif", weight: "600", size: 13 },
			}),
			grid: { spacing: 28, length: 3, colour: "rgba(120, 255, 200, 0.12)", snap: true },
			zoom: { controls: true, wheel: true, startScale: innerWidth < 600 ? 0.62 : 0.9, maxScale: 2, minScale: 0.35 },
			trashcan: true,
			move: { scrollbars: true, drag: true, wheel: false },
		});
		if (saved) {
			try { Blockly.serialization.workspaces.load(saved, ws); } catch (e) { console.warn(e); }
		}
		ws.addChangeListener((e) => {
			if (e.isUiEvent) return;
			UAD_Blocks.onEvent(e, ws);
			refreshCode();
			scheduleSave();
		});
		UAD_Picture.relabel(T, $("#fx"));
		if (window.UAD_ModelsTab) UAD_ModelsTab.relabel(T, l);
		refreshCode();
		resize();
	}

	// --- code -----------------------------------------------------------------------------------
	function generated() {
		return ws ? UAD_Blocks.generate(ws) : "import uad\n";
	}

	function currentCode() {
		return detached ? manualCode : generated();
	}

	function refreshCode() {
		if (!cm || detached) return;
		const code = generated();
		if (cm.getValue() !== code) {
			cm.__setting = true;
			cm.setValue(code);
			cm.__setting = false;
		}
	}

	function setDetached(on) {
		detached = on;
		$("#detached").hidden = !on;
		$("#code-note").hidden = on;
		$("#pane-blocks").classList.toggle("muted", on);
		if (!on) refreshCode();
		scheduleSave();
	}

	// --- project in the browser -------------------------------------------------------------------
	function readProject() {
		try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; }
	}

	function scheduleSave() {
		clearTimeout(saveTimer);
		saveTimer = setTimeout(save, 600);
	}

	function meta() {
		return { name: $("#m-name").value.trim(), author: $("#m-author").value.trim(), version: $("#m-version").value.trim() || "1.0",
			description: $("#m-desc").value.trim() };
	}

	function save() {
		const p = { meta: meta(), blocks: ws ? Blockly.serialization.workspaces.save(ws) : null, detached, code: manualCode,
			picture: UAD_Picture.state(), withPicture: $("#with-pic").checked, models: window.UAD_ModelsTab ? UAD_ModelsTab.all() : {} };
		try {
			localStorage.setItem(KEY, JSON.stringify(p));
			$("#saved").classList.add("show");
			setTimeout(() => $("#saved").classList.remove("show"), 900);
		} catch (e) {}
	}

	// --- file -----------------------------------------------------------------------------------
	const TR = { а: "a", б: "b", в: "v", г: "g", ґ: "g", д: "d", е: "e", є: "ye", ё: "yo", ж: "zh", з: "z", и: "i", і: "i", ї: "yi", й: "y", к: "k", л: "l",
		м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "",
		э: "e", ю: "yu", я: "ya" };

	function modId(name) {
		let s = "";
		for (const ch of (name || "mod").toLowerCase()) s += TR[ch] !== undefined ? TR[ch] : ch;
		s = s.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32);
		return s || "mod";
	}

	function download(blob, file) {
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = file;
		document.body.append(a);
		a.click();
		setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
	}

	async function exportMod() {
		const m = meta();
		const id = modId(m.name || t("mod_name_ph"));
		const zip = new JSZip();
		zip.file("mod.json", JSON.stringify({ id, name: m.name || t("mod_name_ph"), author: m.author, version: m.version, description: m.description }, null, "\t"));
		zip.file("main.py", currentCode());
		if (ws) zip.file("blocks.json", JSON.stringify(Blockly.serialization.workspaces.save(ws)));
		if ($("#with-pic").checked && UAD_Picture.any()) zip.file("picture.uadshader", UAD_Picture.code(m.name, m.description));
		const models = window.UAD_ModelsTab ? UAD_ModelsTab.all() : {};
		for (const n in models) zip.file(n + ".uadmodel", JSON.stringify(Object.assign({}, models[n], { name: n }), null, "\t"));
		const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
		download(blob, id + ".uadmod");
		toast(t("downloaded").replace("%s", id + ".uadmod"));
	}

	function exportPicture() {
		const m = meta();
		const name = m.name || t("pic_title");
		download(new Blob([UAD_Picture.code(name, m.description)], { type: "text/plain" }), modId(name) + ".uadshader");
		toast(t("downloaded").replace("%s", modId(name) + ".uadshader"));
	}

	async function openMod(file) {
		try {
			const zip = await JSZip.loadAsync(file);
			const main = zip.file("main.py");
			if (!main) throw new Error("no main.py");
			const mj = zip.file("mod.json");
			if (mj) {
				const d = JSON.parse(await mj.async("string"));
				$("#m-name").value = d.name || "";
				$("#m-author").value = d.author || "";
				$("#m-version").value = d.version || "1.0";
				$("#m-desc").value = d.description || "";
			}
			const code = await main.async("string");
			const models = {};
			for (const f of Object.keys(zip.files)) {
				if (!f.endsWith(".uadmodel")) continue;
				try { models[f.split("/").pop().replace(/\.uadmodel$/, "")] = JSON.parse(await zip.file(f).async("string")); } catch (e) {}
			}
			if (window.UAD_ModelsTab) UAD_ModelsTab.set(models);
			const bj = zip.file("blocks.json");
			if (bj) {
				ws.clear();
				Blockly.serialization.workspaces.load(JSON.parse(await bj.async("string")), ws);
				setDetached(generated().trim() !== code.trim());
				manualCode = code;
				if (detached) cm.setValue(code);
				toast(t("opened"));
			} else {
				ws.clear();
				manualCode = code;
				setDetached(true);
				cm.setValue(code);
				showTab("code");
				toast(t("opened_code"));
			}
			save();
		} catch (e) {
			console.warn(e);
			toast(t("bad_file"), true);
		}
	}

	// --- examples -------------------------------------------------------------------------------
	const tx = (s) => "<block type=\"text\"><field name=\"TEXT\">" + s + "</field></block>";
	const sh = (s) => "<shadow type=\"text\"><field name=\"TEXT\">" + s + "</field></shadow>";
	const n = (v) => "<shadow type=\"math_number\"><field name=\"NUM\">" + v + "</field></shadow>";

	function example(kind) {
		const nm = { uk: ["Стріла-М", "Ланцет"], ru: ["Стрела-М", "Ланцет"], en: ["Strela-M", "Lancet"] }[lang];
		const xml = {
			weapon: "<xml><block type=\"uad_weapon\" x=\"30\" y=\"30\"><field name=\"ID\">strela_m</field><field name=\"TYPE\">short</field><field name=\"MODEL\">avenger</field>" +
				"<field name=\"NAME\">" + nm[0] + "</field><field name=\"RANGE\">6500</field><field name=\"DAMAGE\">130</field><field name=\"RATE\">1.2</field>" +
				"<field name=\"UNLOCK\">9000</field><field name=\"MPRICE\">700</field><field name=\"TINT\">#7fb8ff</field></block>" +
				"<block type=\"uad_on_buy\" x=\"30\" y=\"300\"><statement name=\"DO\"><block type=\"controls_if\"><value name=\"IF0\"><block type=\"logic_compare\">" +
				"<field name=\"OP\">EQ</field><value name=\"A\"><block type=\"uad_event\"><field name=\"F\">weapon</field></block></value>" +
				"<value name=\"B\">" + tx("strela_m") + "</value></block></value><statement name=\"DO0\"><block type=\"uad_give_ammo\">" +
				"<field name=\"WEAPON\">strela_m</field><value name=\"N\">" + n(6) + "</value><next><block type=\"uad_message\"><field name=\"COL\">#7dffb0</field>" +
				"<value name=\"TEXT\">" + sh(nm[0] + " +6") + "</value></block></next></block></statement></block></statement></block></xml>",
			enemy: "<xml><block type=\"uad_enemy\" x=\"30\" y=\"30\"><field name=\"ID\">lancet</field><field name=\"TYPE\">drone</field><field name=\"MODEL\">shahed</field>" +
				"<field name=\"NAME\">" + nm[1] + "</field><field name=\"SPEED\">80</field><field name=\"HP\">22</field><field name=\"REWARD\">1800</field>" +
				"<field name=\"HIT\">2</field><field name=\"TINT\">#ff9a3d</field><next><block type=\"uad_raid\"><field name=\"ENEMY\">lancet</field>" +
				"<field name=\"NIGHT\">2</field><field name=\"WEIGHT\">1.5</field></block></next></block>" +
				"<block type=\"uad_on_kill\" x=\"30\" y=\"330\"><statement name=\"DO\"><block type=\"controls_if\"><value name=\"IF0\">" +
				"<block type=\"uad_target_is\"><field name=\"ENEMY\">lancet</field></block></value><statement name=\"DO0\"><block type=\"uad_give_money\">" +
				"<value name=\"N\">" + n(300) + "</value><next><block type=\"uad_message\"><field name=\"COL\">#7dffb0</field><value name=\"TEXT\">" +
				sh("+300: " + nm[1]) + "</value></block></next></block></statement></block></statement></block></xml>",
			streak: "<xml><variables><variable id=\"vS\">streak</variable></variables>" +
				"<block type=\"uad_on_kill\" x=\"30\" y=\"30\"><statement name=\"DO\"><block type=\"math_change\"><field name=\"VAR\" id=\"vS\">streak</field>" +
				"<value name=\"DELTA\">" + n(1) + "</value><next><block type=\"controls_if\"><value name=\"IF0\"><block type=\"logic_compare\"><field name=\"OP\">EQ</field>" +
				"<value name=\"A\"><block type=\"math_modulo\"><value name=\"DIVIDEND\"><block type=\"variables_get\"><field name=\"VAR\" id=\"vS\">streak</field></block></value>" +
				"<value name=\"DIVISOR\">" + n(5) + "</value></block></value><value name=\"B\"><block type=\"math_number\"><field name=\"NUM\">0</field></block></value></block></value>" +
				"<statement name=\"DO0\"><block type=\"uad_give_money\"><value name=\"N\"><block type=\"math_arithmetic\"><field name=\"OP\">MULTIPLY</field>" +
				"<value name=\"A\"><block type=\"variables_get\"><field name=\"VAR\" id=\"vS\">streak</field></block></value><value name=\"B\">" + n(200) + "</value></block></value>" +
				"<next><block type=\"uad_alert\"><value name=\"TEXT\"><block type=\"text_join\"><mutation items=\"2\"></mutation><value name=\"ADD0\">" + tx("×") +
				"</value><value name=\"ADD1\"><block type=\"variables_get\"><field name=\"VAR\" id=\"vS\">streak</field></block></value></block></value></block></next>" +
				"</block></statement></block></next></block></statement></block>" +
				"<block type=\"uad_on_impact\" x=\"30\" y=\"360\"><statement name=\"DO\"><block type=\"variables_set\"><field name=\"VAR\" id=\"vS\">streak</field>" +
				"<value name=\"VALUE\"><block type=\"math_number\"><field name=\"NUM\">0</field></block></value></block></statement></block></xml>",
			night: "<xml><block type=\"uad_every\" x=\"30\" y=\"30\"><field name=\"SEC\">30</field><field name=\"NIGHT\">TRUE</field><statement name=\"DO\">" +
				"<block type=\"uad_launch\"><field name=\"ENEMY\">shahed</field><field name=\"AT\">city</field><value name=\"N\">" + n(2) + "</value>" +
				"<next><block type=\"uad_message\"><field name=\"COL\">#ff5a4a</field><value name=\"TEXT\">" + sh("⚠ +2") + "</value></block></next></block>" +
				"</statement></block>" +
				"<block type=\"uad_on_morning\" x=\"30\" y=\"240\"><statement name=\"DO\"><block type=\"controls_if\"><value name=\"IF0\"><block type=\"logic_compare\">" +
				"<field name=\"OP\">EQ</field><value name=\"A\"><block type=\"uad_event\"><field name=\"F\">impacts</field></block></value>" +
				"<value name=\"B\"><block type=\"math_number\"><field name=\"NUM\">0</field></block></value></block></value><statement name=\"DO0\">" +
				"<block type=\"uad_give_money\"><value name=\"N\">" + n(5000) + "</value></block></statement></block></statement></block></xml>",
		}[kind];
		if (ws.getAllBlocks(false).length && !confirm(t("confirm_example"))) return;
		ws.clear();
		Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), ws);
		ws.cleanUp(); // the blocks in a column, none over another (their heights depend on the language)
		ws.scrollCenter();
		if (!$("#m-name").value) $("#m-name").value = t("ex_" + kind);
		setDetached(false);
		showTab("blocks");
	}

	// --- page -----------------------------------------------------------------------------------
	function showTab(name) {
		tab = name;
		document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === name));
		document.querySelectorAll(".pane").forEach((p) => { p.hidden = p.id !== "pane-" + name; });
		if (name === "code" && cm) setTimeout(() => cm.refresh(), 0);
		if (name === "models" && window.UAD_ModelsTab) UAD_ModelsTab.show();
		resize();
	}

	function resize() {
		if (ws && tab === "blocks") setTimeout(() => Blockly.svgResize(ws), 0);
	}

	let toastTimer = 0;
	function toast(text, bad) {
		const el = $("#toast");
		el.textContent = text;
		el.classList.toggle("bad", !!bad);
		el.classList.add("show");
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => el.classList.remove("show"), 4200);
	}

	async function start() {
		const p = readProject();
		if (p.meta) {
			$("#m-name").value = p.meta.name || "";
			$("#m-author").value = p.meta.author || "";
			$("#m-version").value = p.meta.version || "1.0";
			$("#m-desc").value = p.meta.description || "";
		}
		$("#with-pic").checked = p.withPicture !== false;
		manualCode = p.code || "";
		cm = CodeMirror($("#code"), {
			value: "", mode: "python", lineNumbers: true, indentUnit: 4, tabSize: 4, indentWithTabs: false,
			extraKeys: { Tab: (c) => c.replaceSelection("    ") }, viewportMargin: Infinity,
		});
		cm.on("change", () => {
			if (cm.__setting) return;
			manualCode = cm.getValue();
			if (!detached) setDetached(true);
			scheduleSave();
		});
		UAD_Picture.init({ texts: Object.assign({}, UAD_T.en, UAD_T[pickLang()]), controls: $("#fx"), canvas: $("#preview"), note: $("#no-webgl"),
			state: p.picture, onChange: () => { $("#pic-code").textContent = UAD_Picture.code(meta().name, meta().description); scheduleSave(); } });
		$("#pic-code").textContent = UAD_Picture.code(meta().name, meta().description);
		document.querySelectorAll(".lang button").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));
		document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
		document.querySelectorAll("[data-example]").forEach((b) => b.addEventListener("click", () => example(b.dataset.example)));
		document.querySelectorAll(".meta input, .meta textarea").forEach((el) => el.addEventListener("input", () => {
			$("#pic-code").textContent = UAD_Picture.code(meta().name, meta().description);
			scheduleSave();
		}));
		$("#with-pic").addEventListener("change", scheduleSave);
		$("#btn-download").addEventListener("click", exportMod);
		$("#btn-pic").addEventListener("click", exportPicture);
		$("#btn-open").addEventListener("click", () => $("#file").click());
		$("#file").addEventListener("change", (e) => { if (e.target.files[0]) openMod(e.target.files[0]); e.target.value = ""; });
		$("#btn-clear").addEventListener("click", () => { if (confirm(t("confirm_clear"))) { ws.clear(); setDetached(false); } });
		$("#btn-back").addEventListener("click", () => setDetached(false));
		$("#prev-night").addEventListener("change", () => UAD_Picture.setPreview($("#prev-night").checked, $("#prev-alarm").checked));
		$("#prev-alarm").addEventListener("change", () => UAD_Picture.setPreview($("#prev-night").checked, $("#prev-alarm").checked));
		UAD_Picture.setPreview(true, false);
		if (window.UAD_ModelsTab) {
			UAD_ModelsTab.init({ texts: Object.assign({}, UAD_T.en, UAD_T[pickLang()]), lang: pickLang(), models: p.models,
				onChange: () => { refreshCode(); scheduleSave(); } });
		}
		window.addEventListener("resize", resize);
		await setLang(pickLang());
		if (p.detached) {
			setDetached(true);
			cm.__setting = true;
			cm.setValue(manualCode);
			cm.__setting = false;
		} else {
			setDetached(false);
		}
		if (!p.blocks && !p.detached) example("enemy");
		showTab("blocks");
	}

	window.addEventListener("DOMContentLoaded", start);
})();
