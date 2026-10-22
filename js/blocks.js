// The blocks of the mod maker and the Python they write (the "uad" module of the game:
// scripts/mods/mod_api.gd in the UAD repository). Defined again whenever the language changes.

(function () {
	"use strict";

	const PY = window.python || {};
	const gen = PY.pythonGenerator;
	const Order = PY.Order;

	const HUE = { def: 160, enemy: 12, events: 40, actions: 205, info: 265, memory: 300 };
	const COLOURS = [["col_none", ""], ["col_white", "#ffffff"], ["col_green", "#7dffb0"], ["col_yellow", "#ffd84d"],
		["col_orange", "#ff9a3d"], ["col_red", "#ff5a4a"], ["col_blue", "#7fb8ff"]];

	let T = {};
	let LANG = "uk";

	const name3 = (item) => item[LANG] || item.en || item.id;
	const q = (s) => JSON.stringify(String(s));

	// --- dropdown contents ---------------------------------------------------------------------------
	function ownIds(type) {
		const ws = Blockly.getMainWorkspace && Blockly.getMainWorkspace();
		if (!ws) return [];
		return ws.getBlocksByType(type, false).map((b) => b.getFieldValue("ID")).filter((x) => x);
	}

	function weaponOptions() {
		const own = ownIds("uad_weapon").map((id) => ["★ " + id, id]);
		return own.concat(UAD_WEAPONS.map((w) => [name3(w), w.id]));
	}

	function enemyOptions() {
		const own = ownIds("uad_enemy").map((id) => ["★ " + id, id]);
		return own.concat(UAD_ENEMIES.map((e) => [name3(e), e.id]));
	}

	const weaponTypes = () => UAD_WEAPON_TYPES.map((x) => [name3(x), x.id]);
	const enemyTypes = () => UAD_ENEMY_TYPES.map((x) => [name3(x), x.id]);

	// the model: the mod's own ones of that kind first («name.uadmodel» of the 3D models tab), the
	// type's own, then every model of the game
	function modelOptions(kind) {
		const own = window.UAD_ModelsTab ? UAD_ModelsTab.all() : {};
		const out = Object.keys(own).filter((n) => own[n].kind === kind).map((n) => ["★ " + n, n + ".uadmodel"]);
		out.push([T.model_default, "default"]);
		for (const it of (kind === "enemy" ? UAD_ENEMIES : UAD_WEAPONS)) out.push([name3(it), it.id]);
		return out;
	}

	// a new type: the numbers start from that type's own system / threat
	function typeDefaults(block, kind, typeId) {
		const ty = (kind === "enemy" ? UAD_ENEMY_TYPES : UAD_WEAPON_TYPES).find((x) => x.id === typeId);
		const src = ty && (kind === "enemy" ? UAD_ENEMIES : UAD_WEAPONS).find((x) => x.id === ty.template);
		if (!src || block.isInFlyout) return;
		const set = (f, v) => { if (v !== undefined && block.getField(f)) block.setFieldValue(v, f); };
		if (kind === "enemy") {
			set("SPEED", src.speed); set("HP", src.hp); set("REWARD", src.reward); set("HIT", src.hit_damage);
		} else {
			set("RANGE", src.range); set("DAMAGE", src.damage); set("RATE", src.rate); set("UNLOCK", src.unlock); set("MPRICE", src.missile_price || 0);
		}
	}
	const colours = () => COLOURS.map((c) => [T[c[0]], c[1] || "none"]);
	const opts = (list) => list.map((k) => [T[k[0]], k[1]]);

	// a dropdown keeps a value it does not list (a threat of the mod renamed or not built yet)
	function lenientDropdown(fn) {
		const f = new Blockly.FieldDropdown(fn);
		f.doClassValidation_ = function (v) { return v; };
		return f;
	}

	// --- block definitions ---------------------------------------------------------------------------
	function idField(dflt) {
		return { type: "field_input", name: "ID", text: dflt, spellcheck: false };
	}

	function define() {
		const json = [
			{ type: "uad_weapon", message0: T.b_weapon, args0: [idField("my_sam"), { type: "field_dropdown", name: "TYPE", options: weaponTypes() }],
				message1: T.b_model, args1: [{ type: "input_dummy", name: "M" }],
				message2: T.b_name, args2: [{ type: "field_input", name: "NAME", text: T.def_weapon }],
				message3: T.b_range, args3: [{ type: "field_number", name: "RANGE", value: 6000, min: 100, max: 400000 }, { type: "field_number", name: "DAMAGE", value: 120, min: 1, max: 5000 }],
				message4: T.b_rate, args4: [{ type: "field_number", name: "RATE", value: 1.4, min: 0.05, max: 60, precision: 0.05 }, { type: "field_number", name: "UNLOCK", value: 8000, min: 0, max: 5000000 }],
				message5: T.b_mprice, args5: [{ type: "field_number", name: "MPRICE", value: 900, min: 0, max: 1000000 }, { type: "field_dropdown", name: "TINT", options: colours() }],
				previousStatement: "def", nextStatement: "def", colour: HUE.def, tooltip: "uad.weapon(...)" },
			{ type: "uad_change_weapon", message0: T.b_change_weapon,
				args0: [{ type: "input_dummy", name: "W" }, { type: "field_dropdown", name: "FIELD", options: opts([["f_range", "range"], ["f_damage", "damage"], ["f_rate", "rate"], ["f_unlock", "unlock"], ["f_mprice", "missile_price"], ["f_ceil", "ceil"]]) },
					{ type: "field_number", name: "VALUE", value: 2000 }],
				previousStatement: "def", nextStatement: "def", colour: HUE.def, tooltip: "uad.change_weapon(...)" },
			{ type: "uad_enemy", message0: T.b_enemy, args0: [idField("my_drone"), { type: "field_dropdown", name: "TYPE", options: enemyTypes() }],
				message1: T.b_model, args1: [{ type: "input_dummy", name: "M" }],
				message2: T.b_name, args2: [{ type: "field_input", name: "NAME", text: T.def_enemy }],
				message3: T.b_speed, args3: [{ type: "field_number", name: "SPEED", value: 70, min: 5, max: 3000 }, { type: "field_number", name: "HP", value: 30, min: 1, max: 5000 }],
				message4: T.b_reward, args4: [{ type: "field_number", name: "REWARD", value: 1500, min: 0, max: 500000 }, { type: "field_number", name: "HIT", value: 2.5, min: 0, max: 50, precision: 0.1 }],
				message5: T.b_color, args5: [{ type: "field_dropdown", name: "TINT", options: colours() }],
				previousStatement: "def", nextStatement: "def", colour: HUE.enemy, tooltip: "uad.enemy(...)" },
			{ type: "uad_change_enemy", message0: T.b_change_enemy,
				args0: [{ type: "input_dummy", name: "E" }, { type: "field_dropdown", name: "FIELD", options: opts([["f_speed", "speed"], ["f_hp", "hp"], ["f_reward", "reward"], ["f_hit", "hit_damage"], ["f_altmin", "alt_min"], ["f_altmax", "alt_max"], ["f_swarm", "swarm"]]) },
					{ type: "field_number", name: "VALUE", value: 40 }],
				previousStatement: "def", nextStatement: "def", colour: HUE.enemy, tooltip: "uad.change_enemy(...)" },
			{ type: "uad_raid", message0: T.b_raid,
				args0: [{ type: "input_dummy", name: "E" }, { type: "field_number", name: "NIGHT", value: 1, min: 1, max: 99, precision: 1 }, { type: "field_number", name: "WEIGHT", value: 1, min: 0.1, max: 20, precision: 0.1 }],
				previousStatement: "def", nextStatement: "def", colour: HUE.enemy, tooltip: "uad.raid(...)" },
			{ type: "uad_clear_raid", message0: T.b_clear_raid,
				args0: [{ type: "field_dropdown", name: "SLOT", options: opts([["slot_drone", "drone"], ["slot_cruise", "cruise"], ["slot_ballistic", "ballistic"], ["slot_all", "all"]]) }],
				previousStatement: "def", nextStatement: "def", colour: HUE.enemy, tooltip: "uad.clear_raid(...)" },
		];
		for (const ev of ["start", "night", "day", "morning", "kill", "impact", "buy", "launch"]) {
			json.push({ type: "uad_on_" + ev, message0: T["b_on_" + ev], message1: T.b_do + " %1", args1: [{ type: "input_statement", name: "DO" }],
				colour: HUE.events, tooltip: "@uad.on(\"" + ev + "\")", hat: "cap" });
		}
		json.push({ type: "uad_every", message0: T.b_every,
			args0: [{ type: "field_number", name: "SEC", value: 30, min: 1, max: 3600, precision: 1 }, { type: "field_checkbox", name: "NIGHT", checked: true }],
			message1: T.b_do + " %1", args1: [{ type: "input_statement", name: "DO" }], colour: HUE.events, tooltip: "@uad.on(\"tick\")", hat: "cap" });
		const act = (type, msg, args, tip) => ({ type, message0: msg, args0: args, previousStatement: null, nextStatement: null, colour: HUE.actions, tooltip: tip, inputsInline: true });
		json.push(
			act("uad_message", T.b_message, [{ type: "input_value", name: "TEXT" }, { type: "field_dropdown", name: "COL", options: colours().slice(1) }], "uad.message(text, colour)"),
			act("uad_alert", T.b_alert, [{ type: "input_value", name: "TEXT" }], "uad.alert(text)"),
			act("uad_give_money", T.b_money, [{ type: "input_value", name: "N", check: "Number" }], "uad.give_money(n)"),
			act("uad_launch", T.b_launch, [{ type: "input_dummy", name: "E" }, { type: "input_value", name: "N", check: "Number" },
				{ type: "field_dropdown", name: "AT", options: opts([["at_city", "city"], ["at_base", "base"]]) }], "uad.launch(enemy, count)"),
			act("uad_give_weapon", T.b_give_weapon, [{ type: "input_dummy", name: "W" }], "uad.give_weapon(id)"),
			act("uad_give_ammo", T.b_give_ammo, [{ type: "input_dummy", name: "W" }, { type: "input_value", name: "N", check: "Number" }], "uad.give_ammo(id, n)"),
			act("uad_heal", T.b_heal, [{ type: "input_value", name: "N", check: "Number" }], "uad.heal_city(n)"),
			act("uad_data_set", T.b_data_set, [{ type: "field_input", name: "KEY", text: "score" }, { type: "input_value", name: "V" }], "uad.data[key] = value"),
			act("uad_data_add", T.b_data_add, [{ type: "field_input", name: "KEY", text: "score" }, { type: "input_value", name: "V", check: "Number" }], "uad.data[key] += n"),
		);
		const val = (type, msg, args, out, hue, tip) => ({ type, message0: msg, args0: args, output: out, colour: hue, tooltip: tip, inputsInline: true });
		json.push(
			val("uad_event", T.b_event, [{ type: "field_dropdown", name: "F", options: opts([["ev_type", "type"], ["ev_weapon", "weapon"], ["ev_reward", "reward"], ["ev_day", "day"],
				["ev_kills", "kills"], ["ev_impacts", "impacts"], ["ev_count", "count"], ["ev_t", "t"]]) }], null, HUE.info, "e[...]"),
			val("uad_target_is", T.b_target_is, [{ type: "input_dummy", name: "E" }], "Boolean", HUE.info, "e[\"type\"] == ..."),
			val("uad_day", T.b_day, [], "Number", HUE.info, "uad.day()"),
			val("uad_money", T.b_money_now, [], "Number", HUE.info, "uad.money()"),
			val("uad_is_night", T.b_is_night, [], "Boolean", HUE.info, "uad.is_night()"),
			val("uad_city", T.b_city, [], "Number", HUE.info, "uad.city_health()"),
			val("uad_targets", T.b_targets, [], "Number", HUE.info, "len(uad.targets())"),
			val("uad_stat", T.b_stat, [{ type: "field_dropdown", name: "S", options: opts([["st_kills", "kills"], ["st_impacts", "impacts"], ["st_homes", "homes"], ["st_earned", "earned"]]) }], "Number", HUE.info, "uad.stat(name)"),
			val("uad_data_get", T.b_data_get, [{ type: "field_input", name: "KEY", text: "score" }], null, HUE.memory, "uad.data.get(key, 0)"),
		);
		Blockly.defineBlocksWithJsonArray(json);
		// the dropdowns of weapons / threats that include the mod's own ones are added in code
		const addPick = (type, input, fn) => {
			const orig = Blockly.Blocks[type].init;
			Blockly.Blocks[type].init = function () {
				orig.call(this);
				this.getInput(input).appendField(lenientDropdown(fn), input === "W" ? "WEAPON" : "ENEMY");
			};
		};
		addPick("uad_change_weapon", "W", weaponOptions);
		addPick("uad_give_weapon", "W", weaponOptions);
		addPick("uad_give_ammo", "W", weaponOptions);
		addPick("uad_change_enemy", "E", enemyOptions);
		addPick("uad_raid", "E", enemyOptions);
		addPick("uad_launch", "E", enemyOptions);
		addPick("uad_target_is", "E", enemyOptions);
		// event blocks: a warning when they sit outside an event
		for (const type of ["uad_event", "uad_target_is"]) {
			const orig = Blockly.Blocks[type].init;
			Blockly.Blocks[type].init = function () {
				orig.call(this);
				this.setOnChange(function () {
					if (!this.workspace || this.workspace.isFlyout) return;
					this.setWarningText(insideEvent(this) ? null : T.warn_event);
				});
			};
		}
		// field ids stay valid Python-friendly ids; the model row and the type's numbers
		for (const type of ["uad_weapon", "uad_enemy"]) {
			const kind = type === "uad_enemy" ? "enemy" : "weapon";
			const orig = Blockly.Blocks[type].init;
			Blockly.Blocks[type].init = function () {
				orig.call(this);
				this.getField("ID").setValidator((v) => {
					const s = String(v).toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^[^a-z]+/, "").slice(0, 24);
					return s || null;
				});
				this.getInput("M").appendField(lenientDropdown(() => modelOptions(kind)), "MODEL");
				this.setFieldValue("default", "MODEL");
			};
		}
	}

	function insideEvent(block) {
		let b = block.getSurroundParent();
		while (b) {
			if (b.type.startsWith("uad_on_") || b.type === "uad_every") return true;
			b = b.getSurroundParent();
		}
		return false;
	}

	// --- Python ----------------------------------------------------------------------------------------
	const num = (v) => {
		const n = Number(v);
		return Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
	};
	const val = (block, name, order, dflt) => gen.valueToCode(block, name, order === undefined ? Order.NONE : order) || dflt;
	const useUad = () => { gen.definitions_["import_uad"] = "import uad"; };
	const tint = (block) => { const c = block.getFieldValue("TINT"); return c && c !== "none" ? ", tint=" + q(c) : ""; };

	function weaponKind(typeId) {
		const ty = UAD_WEAPON_TYPES.find((x) => x.id === typeId);
		const w = ty && UAD_WEAPONS.find((x) => x.id === ty.template);
		return w ? w.kind : "missile";
	}

	const modelArg = (b) => { const m = b.getFieldValue("MODEL"); return m && m !== "default" ? ", model=" + q(m) : ""; };

	function install() {
		const F = gen.forBlock;
		F.uad_weapon = (b) => {
			useUad();
			const ty = b.getFieldValue("TYPE");
			const mp = weaponKind(ty) === "gun" ? "" : ", missile_price=" + num(b.getFieldValue("MPRICE"));
			return "uad.weapon(" + q(b.getFieldValue("ID")) + ", type=" + q(ty) + modelArg(b) + ", name=" + q(b.getFieldValue("NAME")) +
				",\n    range=" + num(b.getFieldValue("RANGE")) + ", damage=" + num(b.getFieldValue("DAMAGE")) + ", rate=" + num(b.getFieldValue("RATE")) +
				", unlock=" + num(b.getFieldValue("UNLOCK")) + mp + tint(b) + ")\n";
		};
		F.uad_change_weapon = (b) => { useUad(); return "uad.change_weapon(" + q(b.getFieldValue("WEAPON")) + ", " + b.getFieldValue("FIELD") + "=" + num(b.getFieldValue("VALUE")) + ")\n"; };
		F.uad_enemy = (b) => {
			useUad();
			const c = b.getFieldValue("TINT");
			const colour = c && c !== "none" ? ", color=" + q(c) : "";
			return "uad.enemy(" + q(b.getFieldValue("ID")) + ", type=" + q(b.getFieldValue("TYPE")) + modelArg(b) + ", name=" + q(b.getFieldValue("NAME")) +
				",\n    speed=" + num(b.getFieldValue("SPEED")) + ", hp=" + num(b.getFieldValue("HP")) + ", reward=" + num(b.getFieldValue("REWARD")) +
				", hit_damage=" + num(b.getFieldValue("HIT")) + tint(b) + colour + ")\n";
		};
		F.uad_change_enemy = (b) => { useUad(); return "uad.change_enemy(" + q(b.getFieldValue("ENEMY")) + ", " + b.getFieldValue("FIELD") + "=" + num(b.getFieldValue("VALUE")) + ")\n"; };
		F.uad_raid = (b) => { useUad(); return "uad.raid(" + q(b.getFieldValue("ENEMY")) + ", night=" + num(b.getFieldValue("NIGHT")) + ", weight=" + num(b.getFieldValue("WEIGHT")) + ")\n"; };
		F.uad_clear_raid = (b) => { useUad(); const s = b.getFieldValue("SLOT"); return "uad.clear_raid(" + (s === "all" ? "" : q(s)) + ")\n"; };
		let n = 0;
		const handler = (b, ev, cond) => {
			useUad();
			n += 1;
			let body = gen.statementToCode(b, "DO");
			const g = globalsLine(b);
			if (cond) body = gen.INDENT + "if " + cond + ":\n" + (body ? gen.prefixLines(body, gen.INDENT) : gen.INDENT + gen.INDENT + "pass\n");
			if (!body) body = gen.INDENT + "pass\n";
			return "@uad.on(" + q(ev) + ")\ndef on_" + ev + "_" + n + "(e):\n" + g + body + "\n";
		};
		for (const ev of ["start", "night", "day", "morning", "kill", "impact", "buy", "launch"]) F["uad_on_" + ev] = (b) => handler(b, ev, "");
		F.uad_every = (b) => handler(b, "tick", "e[\"t\"] % " + num(b.getFieldValue("SEC")) + " == 0" + (b.getFieldValue("NIGHT") === "TRUE" ? " and e[\"night\"]" : ""));
		F.uad_message = (b) => { useUad(); return "uad.message(" + val(b, "TEXT", Order.NONE, "\"\"") + ", " + q(b.getFieldValue("COL")) + ")\n"; };
		F.uad_alert = (b) => { useUad(); return "uad.alert(" + val(b, "TEXT", Order.NONE, "\"\"") + ")\n"; };
		F.uad_give_money = (b) => { useUad(); return "uad.give_money(int(" + val(b, "N", Order.NONE, "0") + "))\n"; };
		F.uad_launch = (b) => { useUad(); return "uad.launch(" + q(b.getFieldValue("ENEMY")) + ", int(" + val(b, "N", Order.NONE, "1") + ")" + (b.getFieldValue("AT") === "base" ? ", at_base=True" : "") + ")\n"; };
		F.uad_give_weapon = (b) => { useUad(); return "uad.give_weapon(" + q(b.getFieldValue("WEAPON")) + ")\n"; };
		F.uad_give_ammo = (b) => { useUad(); return "uad.give_ammo(" + q(b.getFieldValue("WEAPON")) + ", int(" + val(b, "N", Order.NONE, "1") + "))\n"; };
		F.uad_heal = (b) => { useUad(); return "uad.heal_city(" + val(b, "N", Order.NONE, "0") + ")\n"; };
		F.uad_data_set = (b) => { useUad(); return "uad.data[" + q(b.getFieldValue("KEY")) + "] = " + val(b, "V", Order.NONE, "0") + "\n"; };
		F.uad_data_add = (b) => { useUad(); const k = q(b.getFieldValue("KEY")); return "uad.data[" + k + "] = uad.data.get(" + k + ", 0) + " + val(b, "V", Order.ADDITIVE, "1") + "\n"; };
		F.uad_event = (b) => {
			const f = b.getFieldValue("F");
			const dflt = f === "type" || f === "weapon" ? "\"\"" : "0";
			return [insideEvent(b) ? "e.get(" + q(f) + ", " + dflt + ")" : dflt, Order.FUNCTION_CALL];
		};
		F.uad_target_is = (b) => [insideEvent(b) ? "e.get(\"type\") == " + q(b.getFieldValue("ENEMY")) : "False", Order.RELATIONAL];
		F.uad_day = () => { useUad(); return ["uad.day()", Order.FUNCTION_CALL]; };
		F.uad_money = () => { useUad(); return ["uad.money()", Order.FUNCTION_CALL]; };
		F.uad_is_night = () => { useUad(); return ["uad.is_night()", Order.FUNCTION_CALL]; };
		F.uad_city = () => { useUad(); return ["uad.city_health()", Order.FUNCTION_CALL]; };
		F.uad_targets = () => { useUad(); return ["len(uad.targets())", Order.FUNCTION_CALL]; };
		F.uad_stat = (b) => { useUad(); return ["uad.stat(" + q(b.getFieldValue("S")) + ")", Order.FUNCTION_CALL]; };
		F.uad_data_get = (b) => { useUad(); return ["uad.data.get(" + q(b.getFieldValue("KEY")) + ", 0)", Order.FUNCTION_CALL]; };
		// "change x by 1" without "from numbers import Number" (the game's Python has no such module)
		F.math_change = (b) => {
			const v = gen.getVariableName(b.getFieldValue("VAR"));
			return v + " = (" + v + " or 0) + " + (gen.valueToCode(b, "DELTA", Order.ADDITIVE) || "0") + "\n";
		};
		reset = () => { n = 0; };
	}
	let reset = () => {};

	// the workspace's variables are the module's globals: a handler that changes one says so
	function globalsLine(block) {
		const names = Blockly.Variables.allUsedVarModels(block.workspace).map((v) => gen.getVariableName(v.getId()));
		return names.length ? gen.INDENT + "global " + names.join(", ") + "\n" : "";
	}

	// definitions first, then the raids, then everything else — whatever the blocks' places
	const GROUP = { uad_weapon: 0, uad_enemy: 0, uad_change_weapon: 1, uad_change_enemy: 1, uad_raid: 2, uad_clear_raid: 2 };

	function generate(ws) {
		gen.init(ws);
		reset();
		const parts = [[], [], [], []];
		for (const b of ws.getTopBlocks(true)) {
			if (!b.isEnabled()) continue;
			let code = gen.blockToCode(b);
			if (Array.isArray(code)) continue; // a lone value block does nothing
			if (!code) continue;
			parts[GROUP[b.type] === undefined ? 3 : GROUP[b.type]].push(code);
		}
		let body = parts.map((p) => p.join("")).filter((s) => s).join("\n");
		body = gen.finish(body);
		if (!/^import uad$/m.test(body)) body = "import uad\n\n" + body;
		return body.replace(/\n{3,}/g, "\n\n").trim() + "\n";
	}

	function toolbox() {
		const cat = (name, colour, contents) => ({ kind: "category", name, colour, contents });
		const b = (type, extra) => Object.assign({ kind: "block", type }, extra || {});
		const shadowNum = (n) => ({ shadow: { type: "math_number", fields: { NUM: n } } });
		const shadowText = (s) => ({ shadow: { type: "text", fields: { TEXT: s } } });
		return { kind: "categoryToolbox", contents: [
			cat(T.cat_def, HUE.def, [b("uad_weapon"), b("uad_change_weapon")]),
			cat(T.cat_enemy, HUE.enemy, [b("uad_enemy"), b("uad_change_enemy"), b("uad_raid"), b("uad_clear_raid")]),
			cat(T.cat_events, HUE.events, ["start", "night", "day", "morning", "kill", "impact", "buy", "launch"].map((e) => b("uad_on_" + e)).concat([b("uad_every")])),
			cat(T.cat_actions, HUE.actions, [
				b("uad_message", { inputs: { TEXT: shadowText("+300!") } }), b("uad_alert", { inputs: { TEXT: shadowText("!!!") } }),
				b("uad_give_money", { inputs: { N: shadowNum(500) } }), b("uad_launch", { inputs: { N: shadowNum(2) } }),
				b("uad_give_weapon"), b("uad_give_ammo", { inputs: { N: shadowNum(4) } }), b("uad_heal", { inputs: { N: shadowNum(5) } }),
			]),
			cat(T.cat_info, HUE.info, [b("uad_event"), b("uad_target_is"), b("uad_day"), b("uad_money"), b("uad_is_night"), b("uad_city"), b("uad_targets"), b("uad_stat")]),
			cat(T.cat_memory, HUE.memory, [b("uad_data_set", { inputs: { V: shadowNum(0) } }), b("uad_data_add", { inputs: { V: shadowNum(1) } }), b("uad_data_get")]),
			{ kind: "sep" },
			cat(T.cat_logic, "#5b80a5", [b("controls_if"), b("logic_compare"), b("logic_operation"), b("logic_negate"), b("logic_boolean")]),
			cat(T.cat_loops, "#5ba55b", [b("controls_repeat_ext", { inputs: { TIMES: shadowNum(3) } }), b("controls_whileUntil"),
				b("controls_for", { inputs: { FROM: shadowNum(1), TO: shadowNum(5), BY: shadowNum(1) } }), b("controls_forEach"), b("controls_flow_statements")]),
			cat(T.cat_math, "#5b67a5", [b("math_number"), b("math_arithmetic", { inputs: { A: shadowNum(1), B: shadowNum(1) } }),
				b("math_modulo", { inputs: { DIVIDEND: shadowNum(10), DIVISOR: shadowNum(5) } }), b("math_random_int", { inputs: { FROM: shadowNum(1), TO: shadowNum(6) } }),
				b("math_round"), b("math_change", { inputs: { DELTA: shadowNum(1) } })]),
			cat(T.cat_text, "#5ba58c", [b("text"), b("text_join"), b("text_print", { inputs: { TEXT: shadowText("hello") } })]),
			cat(T.cat_lists, "#745ba5", [b("lists_create_with"), b("lists_length"), b("lists_getIndex")]),
			{ kind: "category", name: T.cat_vars, colour: "#a55b80", custom: "VARIABLE" },
		] };
	}

	window.UAD_Blocks = {
		setup(texts, lang) {
			T = texts;
			LANG = lang;
			define();
			install();
			gen.INDENT = "    ";
		},
		toolbox,
		generate,
		// a person picked another type: the numbers start from that type's own (a loaded block keeps its own)
		onEvent(e, ws) {
			if (e.type !== Blockly.Events.BLOCK_CHANGE || e.element !== "field" || e.name !== "TYPE" || e.isUiEvent) return;
			const b = ws.getBlockById(e.blockId);
			if (b && (b.type === "uad_weapon" || b.type === "uad_enemy")) typeDefaults(b, b.type === "uad_enemy" ? "enemy" : "weapon", e.newValue);
		},
	};
})();
