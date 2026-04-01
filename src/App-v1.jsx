import { useState, useRef } from "react";

// ─── Data ─────────────────────────────────────────────────────────────────────
const VEHICLE_ANGLES = [
  { id:"front", label:"Front",       icon:"⬆️", desc:"Straight-on front view" },
  { id:"back",  label:"Rear",        icon:"⬇️", desc:"Straight-on rear view" },
  { id:"left",  label:"Driver Side", icon:"⬅️", desc:"Full left side profile" },
  { id:"right", label:"Pass. Side",  icon:"➡️", desc:"Full right side profile" },
];
const WHEEL_SPOTS = [
  { id:"fl", label:"Front Left",  icon:"↖️" },
  { id:"fr", label:"Front Right", icon:"↗️" },
  { id:"rl", label:"Rear Left",   icon:"↙️" },
  { id:"rr", label:"Rear Right",  icon:"↘️" },
];

// Known car makes for spell-check validation
const KNOWN_MAKES = [
  "acura","alfa romeo","aston martin","audi","bentley","bmw","buick","cadillac",
  "chevrolet","chrysler","dodge","ferrari","fiat","ford","genesis","gmc","honda",
  "hyundai","infiniti","jaguar","jeep","kia","lamborghini","land rover","lexus",
  "lincoln","lotus","maserati","mazda","mclaren","mercedes","mercedes-benz",
  "mini","mitsubishi","nissan","pontiac","porsche","ram","rolls-royce","saturn",
  "scion","subaru","suzuki","tesla","toyota","volkswagen","volvo"
];

const FLUIDS = [
  { id:"engineOil", label:"Engine Oil", icon:"🛢️", type:"dipstick", colors:["#fefde8","#f5d060","#b45309","#100500"], colorLabels:["New / Clear Yellow","Amber (good)","Dark Brown","Black/Sludge — change now"], intervals:[5000], critical:true, notes:"Check viscosity, level, color. Milky appearance = coolant contamination. Very light yellow = freshly changed. Darkening to black = needs change." },
];

// ─── Validation ───────────────────────────────────────────────────────────────
const isValidName    = v => v.trim().length >= 2 && /^[a-zA-Z\s'\-]+$/.test(v.trim());
const isValidPhone   = v => /^[\d\s\-\(\)\+]{7,15}$/.test(v.trim());
const isValidEmail   = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isValidAddress = v => v.trim().length >= 5;
const isValidYear    = v => /^\d{4}$/.test(v) && parseInt(v) >= 1980 && parseInt(v) <= new Date().getFullYear() + 1;
const isValidMiles   = v => /^\d+$/.test(v.trim()) && parseInt(v) > 0;
const isValidVin     = v => v.trim().length === 17;
const isValidText    = v => v.trim().length >= 2 && /^[a-zA-Z0-9\s\-]+$/.test(v.trim());

// Make validation: must be a known car brand (handles common misspellings)
const isValidMake = v => {
  if (v.trim().length < 2) return false;
  const lower = v.trim().toLowerCase();
  // Exact match
  if (KNOWN_MAKES.includes(lower)) return true;
  // Check for close match (within 2 char edit distance for typos)
  return KNOWN_MAKES.some(make => {
    if (Math.abs(make.length - lower.length) > 3) return false;
    // Simple contains check for partial matches
    if (make.startsWith(lower.slice(0,4)) && lower.length >= 4) return true;
    // Levenshtein-lite: count matching chars
    let matches = 0;
    for (let i = 0; i < Math.min(lower.length, make.length); i++) {
      if (lower[i] === make[i]) matches++;
    }
    return matches / make.length > 0.8;
  });
};

// Model: just needs to be text, no numbers-only
const isValidModel = v => v.trim().length >= 1 && /^[a-zA-Z0-9\s\-]+$/.test(v.trim()) && !/^\d+$/.test(v.trim());

function getMakeHint(v) {
  if (!v.trim() || v.trim().length < 2) return null;
  const lower = v.trim().toLowerCase();
  if (KNOWN_MAKES.includes(lower)) return null;
  // Find closest match to suggest
  const close = KNOWN_MAKES.find(make => {
    const minLen = Math.min(make.length, lower.length);
    let matches = 0;
    for (let i = 0; i < minLen; i++) if (lower[i] === make[i]) matches++;
    return matches >= 4 && matches / make.length > 0.6;
  });
  if (close) return `Did you mean "${close.charAt(0).toUpperCase() + close.slice(1)}"?`;
  return "Unknown make — check spelling";
}

function mileRec(fluid, miles) {
  if (!fluid.intervals[0] || !miles) return null;
  const m = parseInt(miles); if (isNaN(m)) return null;
  const iv = fluid.intervals[0], rem = iv - (m % iv);
  if (rem < iv * 0.1) return { status:"overdue", msg:"Overdue — service needed now" };
  if (rem < iv * 0.25) return { status:"soon",   msg:`Due soon (~${rem.toLocaleString()} mi)` };
  return { status:"ok", msg:`On track (~${rem.toLocaleString()} mi left)` };
}

// ─── FieldBox ─────────────────────────────────────────────────────────────────
function FieldBox({ label, value, onChange, placeholder, validate, hint, type="text", required=true }) {
  const [touched, setTouched] = useState(false);
  const valid  = required ? (validate ? validate(value) : value.trim().length > 0) : true;
  const filled = value.trim().length > 0;
  const showR  = touched && !valid;
  const showG  = touched && valid && filled;
  const hintMsg = hint && touched && !valid && filled ? hint(value) : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
      <label style={{ fontSize:10, fontWeight:700, letterSpacing:"0.09em", color:"#94a3b8", textTransform:"uppercase" }}>
        {label}{required && <span style={{ color:"#f87171" }}> *</span>}
      </label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        style={{
          background: showR ? "#fef2f2" : showG ? "#f0fdf4" : "#1e293b",
          border: `2px solid ${showR ? "#ef4444" : showG ? "#22c55e" : "#334155"}`,
          borderRadius: 8, padding: "9px 11px",
          color: showR ? "#991b1b" : showG ? "#166534" : "#f1f5f9",
          fontSize: 13, outline:"none", transition:"all 0.2s", width:"100%", boxSizing:"border-box",
        }}
      />
      {showR && (
        <span style={{ fontSize:10, color:"#f87171" }}>
          {hintMsg || (!filled ? `${label} is required` : `Invalid ${label.toLowerCase()}`)}
        </span>
      )}
      {showG && (
        <span style={{ fontSize:10, color:"#22c55e" }}>✓ Looks good</span>
      )}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, color="#22c55e", size="md" }) {
  const w = size==="sm" ? 36 : 44, h = size==="sm" ? 20 : 24, th = size==="sm" ? 14 : 18;
  return (
    <button onClick={() => onChange(!checked)}
      style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none", cursor:"pointer", padding:0 }}>
      <div style={{ width:w, height:h, borderRadius:h/2, background:checked?color:"#334155", position:"relative", transition:"background 0.3s", flexShrink:0 }}>
        <div style={{ width:th, height:th, borderRadius:"50%", background:"#fff", position:"absolute", top:(h-th)/2, left:checked?w-th-(h-th)/2:(h-th)/2, transition:"left 0.3s", boxShadow:"0 1px 3px rgba(0,0,0,0.3)" }}/>
      </div>
      <span style={{ fontSize:size==="sm"?11:13, color:checked?color:"#64748b", fontWeight:600, transition:"color 0.3s" }}>{label}</span>
    </button>
  );
}

// ─── Photo Tile ───────────────────────────────────────────────────────────────
function PhotoTile({ label, icon, desc, photo, onCapture, required=true, compact=false }) {
  const inputRef = useRef();
  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onCapture(ev.target.result);
    reader.readAsDataURL(file);
  };
  const h = compact ? 150 : 180;
  return (
    <div onClick={() => inputRef.current.click()} style={{
      cursor:"pointer", borderRadius:12,
      border:`2px solid ${photo ? "#22c55e" : "#334155"}`,
      background: photo ? "#052e16" : "#1e293b",
      position:"relative", height:h,
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      overflow:"hidden", transition:"all 0.2s", flexShrink:0,
    }}>
      <input ref={inputRef} type="file" accept="image/*" capture="environment"
        onChange={handleFile} style={{ display:"none" }}/>
      {photo ? (
        <>
          <img src={photo} alt={label} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,#000c 0%,transparent 55%)" }}>
            <div style={{ position:"absolute", bottom:8, left:8, right:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, fontWeight:700, color:"#bbf7d0" }}>✓ {label}</span>
              <span style={{ fontSize:9, color:"#86efac", background:"#14532d99", padding:"2px 6px", borderRadius:99 }}>retake</span>
            </div>
          </div>
        </>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6, padding:"12px 8px", width:"100%", boxSizing:"border-box" }}>
          <div style={{ width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, lineHeight:1, flexShrink:0 }}>
            {icon}
          </div>
          <span style={{ fontSize:12, fontWeight:700, color:"#f1f5f9", textAlign:"center", lineHeight:1.2 }}>{label}</span>
          {!compact && <span style={{ fontSize:9, color:"#64748b", textAlign:"center", lineHeight:1.3, maxWidth:120 }}>{desc}</span>}
          <div style={{ background:"#334155", borderRadius:6, padding:"3px 10px", fontSize:10, color:"#94a3b8", marginTop:2 }}>
            📷 Tap to capture
          </div>
          {required && <div style={{ position:"absolute", top:8, right:8, width:8, height:8, borderRadius:"50%", background:"#f87171" }}/>}
        </div>
      )}
    </div>
  );
}

// ─── VERTICAL Dipstick — points downward like a real engine dipstick ──────────
// Handle ring at TOP. Stick goes DOWN. Tip (pointed) at BOTTOM.
// Crosshatch diamond pattern ONLY in the center zone between L (low, lower) and F (full, upper).
// Oil fill rises from the BOTTOM (tip) upward — more oil = higher level.
// L mark is BELOW F mark (low = closer to tip = lower on stick).
function DipstickGauge({ label, colors, colorLabels, level, colorIdx, onLevelChange, onColorChange }) {
  const fillColor = colors[colorIdx] || colors[0];

  // SVG geometry — vertical stick
  const SVG_W = 200, SVG_H = 340;
  const stickX = 72;   // center X of stick
  const stickW = 32;   // width of stick body
  const stickTop = 52; // y where stick body starts (below handle)
  const stickBot = 290;// y where stick body ends (before pointed tip)
  const stickH = stickBot - stickTop;

  // The measurement zone (crosshatch area) — center portion of stick
  // F (full) mark is HIGHER on the stick (lower Y value)
  // L (low)  mark is LOWER  on the stick (higher Y value)
  const fMarkY = stickTop + Math.round(stickH * 0.28); // F = upper mark (~28% from top)
  const lMarkY = stickTop + Math.round(stickH * 0.62); // L = lower mark (~62% from top)
  const hatchTop = fMarkY;
  const hatchBot = lMarkY;
  const hatchH   = hatchBot - hatchTop;

  // Oil level: 0% = tip of stick (stickBot), 100% = top of stick (stickTop)
  // Fill rises from bottom. The fill Y start = stickBot - (level/100)*stickH
  const fillTopY = stickBot - Math.round((level / 100) * stickH);

  const uid = "EngineOil";

  // Status based on where level lands relative to L and F marks
  const statusLabel = level < 28  ? "ADD OIL"  :
                      level < 42  ? "LOW"       :
                      level <= 72 ? "O.K."      : "TOO FULL";
  const statusColor = level < 28  ? "#ef4444"   :
                      level < 42  ? "#f97316"   :
                      level <= 72 ? "#22c55e"   : "#eab308";

  // Arrow indicator Y (current oil surface)
  const arrowY = fillTopY;

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, width:"100%" }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"center", gap:8, width:"100%" }}>

        {/* ── DIPSTICK SVG ── */}
        <svg width={SVG_W} height={SVG_H} style={{ overflow:"visible", flexShrink:0 }}>
          <defs>
            {/* Clip to stick body rectangle */}
            <clipPath id="ds-stick-body">
              <rect x={stickX - stickW/2} y={stickTop} width={stickW} height={stickH + 20}/>
            </clipPath>
            {/* Clip to hatch zone only */}
            <clipPath id="ds-hatch-zone">
              <rect x={stickX - stickW/2} y={hatchTop} width={stickW} height={hatchH}/>
            </clipPath>
          </defs>

          {/* ── HANDLE RING at top ── */}
          {/* Outer ring */}
          <ellipse cx={stickX} cy={22} rx={18} ry={13} fill="#64748b" stroke="#94a3b8" strokeWidth={1.5}/>
          {/* Inner hole */}
          <ellipse cx={stickX} cy={22} rx={10} ry={7} fill="#0f172a"/>
          {/* Neck connecting ring to stick */}
          <rect x={stickX - 5} y={30} width={10} height={stickTop - 28} rx={3} fill="#5a6a7a"/>

          {/* ── STICK BODY (metal rod) ── */}
          <rect x={stickX - stickW/2} y={stickTop} width={stickW} height={stickH}
            fill="#1a2535" stroke="#475569" strokeWidth={1.5} rx={3}/>

          {/* ── POINTED TIP at bottom ── */}
          <polygon
            points={`${stickX-stickW/2},${stickBot} ${stickX+stickW/2},${stickBot} ${stickX},${stickBot+22}`}
            fill="#1a2535" stroke="#475569" strokeWidth={1.5}/>

          {/* ── OIL FILL — rises from tip upward ── */}
          <rect
            x={stickX - stickW/2 + 1}
            y={fillTopY}
            width={stickW - 2}
            height={stickBot - fillTopY}
            fill={fillColor}
            opacity={colorIdx === 0 ? 0.70 : 0.92}
            clipPath="url(#ds-stick-body)"
            style={{ transition:"y 0.35s ease, height 0.35s ease" }}
          />
          {/* Oil fill continues into tip polygon — separate fill */}
          <polygon
            points={`${stickX-stickW/2},${stickBot} ${stickX+stickW/2},${stickBot} ${stickX},${stickBot+22}`}
            fill={fillColor} opacity={colorIdx === 0 ? 0.60 : 0.88}
          />

          {/* ── HATCH ZONE dark overlay (so crosshatch shows clearly) ── */}
          <rect x={stickX - stickW/2} y={hatchTop} width={stickW} height={hatchH}
            fill="#0a1020" opacity={0.35} clipPath="url(#ds-stick-body)"/>

          {/* ── DIAMOND CROSSHATCH — ONLY in center zone between L and F ── */}
          <g clipPath="url(#ds-hatch-zone)">
            {Array.from({ length: 22 }).map((_, i) => {
              const sp = 10;
              const startY = hatchTop - stickW + i * sp;
              return [
                // top-left → bottom-right diagonal
                <line key={`x1-${i}`}
                  x1={stickX - stickW/2} y1={startY}
                  x2={stickX + stickW/2} y2={startY + stickW}
                  stroke="#ffffff" strokeWidth={0.9} opacity={0.38}/>,
                // top-right → bottom-left diagonal
                <line key={`x2-${i}`}
                  x1={stickX + stickW/2} y1={startY}
                  x2={stickX - stickW/2} y2={startY + stickW}
                  stroke="#ffffff" strokeWidth={0.9} opacity={0.38}/>,
              ];
            })}
          </g>

          {/* Hatch zone border lines (horizontal, left+right edges) */}
          <line x1={stickX-stickW/2} y1={hatchTop} x2={stickX+stickW/2} y2={hatchTop} stroke="#94a3b8" strokeWidth={1.2}/>
          <line x1={stickX-stickW/2} y1={hatchBot} x2={stickX+stickW/2} y2={hatchBot} stroke="#94a3b8" strokeWidth={1.2}/>

          {/* ── F mark (FULL — upper mark) ── */}
          <line x1={stickX - stickW/2 - 8} y1={fMarkY} x2={stickX + stickW/2 + 8} y2={fMarkY}
            stroke="#22c55e" strokeWidth={1.8}/>
          {/* F label — right side */}
          <text x={stickX + stickW/2 + 14} y={fMarkY + 4} fill="#22c55e" fontSize={12} fontWeight="700">F</text>
          <text x={stickX + stickW/2 + 28} y={fMarkY + 4} fill="#94a3b8" fontSize={8}>Full level</text>

          {/* ── L mark (LOW — lower mark) ── */}
          <line x1={stickX - stickW/2 - 8} y1={lMarkY} x2={stickX + stickW/2 + 8} y2={lMarkY}
            stroke="#f87171" strokeWidth={1.8}/>
          {/* L label — right side */}
          <text x={stickX + stickW/2 + 14} y={lMarkY + 4} fill="#f87171" fontSize={12} fontWeight="700">L</text>
          <text x={stickX + stickW/2 + 28} y={lMarkY + 4} fill="#94a3b8" fontSize={8}>Low level</text>

          {/* ── Arrow indicator pointing DOWN to current oil surface ── */}
          {/* Arrow shaft */}
          <line
            x1={stickX - stickW/2 - 22} y1={arrowY - 18}
            x2={stickX - stickW/2 - 22} y2={arrowY - 4}
            stroke={statusColor} strokeWidth={2.5} strokeLinecap="round"
            style={{ transition:"y1 0.35s ease, y2 0.35s ease" }}/>
          {/* Arrowhead pointing DOWN ▼ */}
          <polygon
            points={`
              ${stickX - stickW/2 - 28},${arrowY - 4}
              ${stickX - stickW/2 - 16},${arrowY - 4}
              ${stickX - stickW/2 - 22},${arrowY + 4}
            `}
            fill={statusColor}
            style={{ transition:"all 0.35s ease" }}/>
          {/* Arrow level % label */}
          <text x={stickX - stickW/2 - 22} y={arrowY - 22}
            textAnchor="middle" fill={statusColor} fontSize={9} fontWeight="700"
            style={{ transition:"y 0.35s ease" }}>{level}%</text>

          {/* ── Status badge ── */}
          <rect x={stickX - 36} y={SVG_H - 28} width={72} height={20} rx={10}
            fill={`${statusColor}22`} stroke={statusColor} strokeWidth={1}/>
          <text x={stickX} y={SVG_H - 14} textAnchor="middle" fill={statusColor} fontSize={11} fontWeight="700">
            {statusLabel}
          </text>

          {/* Minor tick marks on right edge of stick */}
          {Array.from({ length: 9 }).map((_, i) => {
            const y = stickTop + Math.round(((i+1)/10) * stickH);
            return <line key={i}
              x1={stickX + stickW/2} y1={y}
              x2={stickX + stickW/2 + 5} y2={y}
              stroke="#334155" strokeWidth={1}/>;
          })}
        </svg>

        {/* ── Vertical slider (right of stick) ── */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, paddingTop: stickTop + 10 }}>
          <span style={{ fontSize:9, color:"#64748b", fontWeight:700 }}>FULL</span>
          <input type="range" min={0} max={100} value={level}
            onChange={e => onLevelChange(parseInt(e.target.value))}
            style={{ writingMode:"vertical-lr", direction:"rtl", width:22, height:stickH - 20, cursor:"pointer", accentColor:fillColor }}/>
          <span style={{ fontSize:9, color:"#64748b", fontWeight:700 }}>LOW</span>
        </div>
      </div>

      {/* ── Oil Color selector ── */}
      <div style={{ width:"100%", maxWidth:280 }}>
        <div style={{ fontSize:10, color:"#64748b", marginBottom:7, textTransform:"uppercase", letterSpacing:"0.06em" }}>Oil Color / Condition</div>
        <div style={{ display:"flex", gap:9, alignItems:"center" }}>
          {colors.map((c, i) => (
            <button key={i} onClick={() => onColorChange(i)} title={colorLabels[i]}
              style={{
                width:30, height:30, borderRadius:"50%",
                border:`3px solid ${colorIdx===i ? "#f1f5f9" : "#334155"}`,
                background:c, cursor:"pointer", transition:"all 0.2s", flexShrink:0,
                boxShadow:colorIdx===i ? `0 0 0 3px ${c}66` : "none",
                outline: i===0 ? "1px dashed #94a3b8" : "none",
              }}/>
          ))}
        </div>
        <div style={{ fontSize:11, color:"#94a3b8", marginTop:6, fontWeight:600 }}>{colorLabels[colorIdx]}</div>
      </div>
    </div>
  );
}



// ── Oil Inspection Checks data ────────────────────────────────────────────────
const OIL_CHECKS = [
  {
    id: "smell",
    label: "Oil Smell",
    icon: "👃",
    description: "Pull dipstick and smell the oil",
    options: [
      { value:"normal",   label:"Normal / No odor",        color:"#22c55e", hint:"Fresh or slightly used oil with no odor — normal" },
      { value:"burnt",    label:"Burnt / Sharp smell",      color:"#f97316", hint:"Burnt smell = oil overheated or engine running hot" },
      { value:"fuel",     label:"Gasoline smell",           color:"#ef4444", hint:"Gas in oil = fuel injector leak or short trips. Change oil immediately." },
      { value:"sweet",    label:"Sweet / Coolant smell",    color:"#ef4444", hint:"Sweet smell = coolant contamination. Head gasket may be blown." },
      { value:"sulfur",   label:"Sulfur / Rotten egg",      color:"#dc2626", hint:"Sulfur smell = catalytic converter or fuel mixture issue." },
    ],
  },
  {
    id: "viscosity",
    label: "Viscosity / Thickness",
    icon: "💧",
    description: "Rub oil between fingers to test thickness",
    options: [
      { value:"normal",   label:"Normal — smooth & slippery", color:"#22c55e", hint:"Good viscosity for the oil weight specified" },
      { value:"thin",     label:"Thin / Watery",              color:"#eab308", hint:"Too thin = oil diluted by fuel or water. Investigate and change." },
      { value:"thick",    label:"Thick / Sluggish",           color:"#f97316", hint:"Overly thick = sludge buildup or wrong oil weight." },
      { value:"gritty",   label:"Gritty / Sandy texture",     color:"#ef4444", hint:"Grit = metal particles or dirt contamination. Change oil now." },
      { value:"foamy",    label:"Foamy / Bubbly",             color:"#dc2626", hint:"Foamy = coolant mixed with oil. Serious — stop driving." },
    ],
  },
  {
    id: "color",
    label: "Oil Color (Visual)",
    icon: "🎨",
    description: "Hold dipstick up to light for color check",
    options: [
      { value:"clear_yellow", label:"Clear / Light yellow",   color:"#fef08a", hint:"Just changed — brand new oil" },
      { value:"amber",        label:"Amber / Golden",         color:"#f59e0b", hint:"Good — oil doing its job, normal use" },
      { value:"brown",        label:"Dark brown",             color:"#92400e", hint:"Aging oil — monitor, change soon" },
      { value:"black",        label:"Black / Opaque",         color:"#475569", hint:"Overdue for change. Carbon and soot buildup." },
      { value:"milky",        label:"Milky / Creamy",         color:"#e2e8f0", hint:"Coolant contamination — head gasket issue. Do not drive." },
    ],
  },
  {
    id: "contaminants",
    label: "Contaminants Check",
    icon: "🔬",
    description: "Inspect dipstick for particles or residue",
    options: [
      { value:"clean",    label:"Clean — no particles",       color:"#22c55e", hint:"No visible contamination detected" },
      { value:"metal",    label:"Metal flakes/shavings",      color:"#ef4444", hint:"Metal particles = engine wear. Immediate inspection needed." },
      { value:"sludge",   label:"Sludge / Tar-like deposits", color:"#b45309", hint:"Sludge buildup = neglected oil changes. Flush and change." },
      { value:"water",    label:"Water droplets",             color:"#f97316", hint:"Water = condensation or head gasket leak." },
      { value:"dirt",     label:"Dirt / Debris",              color:"#d97706", hint:"Dirt = air filter failure or crankcase breather issue." },
    ],
  },
  {
    id: "leaks",
    label: "External Leak Check",
    icon: "🔍",
    description: "Inspect engine exterior and ground beneath",
    options: [
      { value:"none",     label:"No leaks detected",          color:"#22c55e", hint:"No visible leaks on engine or ground" },
      { value:"seeping",  label:"Slight seep / Wet spots",    color:"#eab308", hint:"Minor seeping — monitor at next service" },
      { value:"dripping", label:"Active drip",                color:"#f97316", hint:"Active drip — locate and seal source before next drive" },
      { value:"major",    label:"Major leak / Pooling",       color:"#ef4444", hint:"Major leak — do not drive. Tow to shop immediately." },
    ],
  },
  {
    id: "oilPressure",
    label: "Oil Pressure Warning Light",
    icon: "⚠️",
    description: "Check if oil pressure warning light has appeared",
    options: [
      { value:"off",      label:"Light OFF — normal",         color:"#22c55e", hint:"No oil pressure warning — system operating normally" },
      { value:"flicker",  label:"Flickered briefly",          color:"#eab308", hint:"Occasional flicker = low level or failing sensor" },
      { value:"on",       label:"Light ON while driving",     color:"#ef4444", hint:"Constant light = low pressure. Stop engine immediately." },
    ],
  },
  {
    id: "consumption",
    label: "Oil Consumption",
    icon: "📉",
    description: "Ask customer how often they add oil between changes",
    options: [
      { value:"none",     label:"No top-off needed",          color:"#22c55e", hint:"Normal consumption — no oil added between changes" },
      { value:"minor",    label:"Add ~1 qt per 3,000 mi",    color:"#eab308", hint:"Slightly elevated — monitor but acceptable for older engines" },
      { value:"moderate", label:"Add 1 qt per 1,000 mi",     color:"#f97316", hint:"High consumption — check valve seals and piston rings" },
      { value:"severe",   label:"Add 1+ qt per 500 mi",      color:"#ef4444", hint:"Severe consumption — major engine wear or leak present" },
    ],
  },
];

// ── OilCheckRow component ──────────────────────────────────────────────────────
function OilCheckRow({ check, selected, onSelect }) {
  return (
    <div style={{ background:"#0f172a", borderRadius:10, padding:"12px 14px", marginBottom:10 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
        <span style={{ fontSize:16, lineHeight:1 }}>{check.icon}</span>
        <div>
          <div style={{ fontWeight:700, fontSize:13, color:"#f1f5f9" }}>{check.label}</div>
          <div style={{ fontSize:10, color:"#64748b", marginTop:1 }}>{check.description}</div>
        </div>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {check.options.map(opt => {
          const isSelected = selected === opt.value;
          return (
            <button key={opt.value} onClick={() => onSelect(opt.value)}
              style={{
                padding:"5px 11px", borderRadius:8, fontSize:11, fontWeight:700,
                cursor:"pointer", transition:"all 0.2s",
                background: isSelected ? `${opt.color}22` : "#1e293b",
                border: `1.5px solid ${isSelected ? opt.color : "#334155"}`,
                color: isSelected ? opt.color : "#64748b",
              }}>
              {opt.label}
            </button>
          );
        })}
      </div>
      {selected && (() => {
        const opt = check.options.find(o => o.value === selected);
        return opt ? (
          <div style={{
            marginTop:8, fontSize:10, color: opt.color,
            background:`${opt.color}12`, borderRadius:6, padding:"5px 10px",
            lineHeight:1.4, fontWeight:500,
          }}>
            💡 {opt.hint}
          </div>
        ) : null;
      })()}
    </div>
  );
}

// ─── Fluid Card ───────────────────────────────────────────────────────────────
const GAUGE_BOX_H = 400;

function FluidCard({ fluid, miles, state, onUpdate, photoUploaded }) {
  const rec = mileRec(fluid, miles);
  const recColor = rec?.status==="overdue" ? "#ef4444" : rec?.status==="soon" ? "#eab308" : "#22c55e";

  return (
    <div style={{
      background: state.alreadyDone ? "linear-gradient(135deg,#0f2a1a,#1a3a2a)" : "#1e293b",
      border: `1.5px solid ${state.alreadyDone ? "#16a34a" : state.status==="Service Now" ? "#ef4444" : "#334155"}`,
      borderRadius:14, padding:"16px 18px", transition:"all 0.3s",
      display:"flex", flexDirection:"column",
    }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:20, lineHeight:1, flexShrink:0 }}>{fluid.icon}</span>
          <div>
            <div style={{ fontWeight:800, fontSize:14, color:"#f1f5f9", lineHeight:1.2 }}>{fluid.label}</div>
            {fluid.critical && <span style={{ fontSize:9, background:"#7c3aed22", color:"#a78bfa", padding:"1px 6px", borderRadius:99, fontWeight:700 }}>CRITICAL</span>}
          </div>
        </div>
        <Toggle checked={state.toggled} onChange={v=>onUpdate({toggled:v})} label={state.toggled?"On":"Skip"} color="#3b82f6" size="sm"/>
      </div>

      {state.toggled && (
        <>
          {/* Photo warning */}
          {!photoUploaded && (
            <div style={{ background:"#1c1917", border:"1.5px dashed #78350f", borderRadius:10, padding:"8px 12px", marginBottom:10, fontSize:11, color:"#fbbf24", fontWeight:600 }}>
              📸 Upload a photo of this fluid to complete inspection
            </div>
          )}
          {/* Already serviced toggle */}
          <div style={{ marginBottom:10 }}>
            <Toggle checked={state.alreadyDone} onChange={v=>onUpdate({alreadyDone:v})}
              label={state.alreadyDone ? "✅ Already serviced — On Track" : "Mark as already serviced"} color="#22c55e" size="sm"/>
          </div>

          {!state.alreadyDone && (
            <>
              {/* Mile rec */}
              {rec && (
                <div style={{ background:`${recColor}18`, border:`1px solid ${recColor}40`, borderRadius:8, padding:"5px 10px", marginBottom:10, fontSize:11, color:recColor, fontWeight:600 }}>
                  🔧 {rec.msg}
                </div>
              )}

              {/* ── GAUGE BOX ── */}
              <div style={{
                background:"#0f172a", borderRadius:10, padding:"16px 12px", marginBottom:12,
                minHeight:GAUGE_BOX_H, display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <DipstickGauge
                  label={fluid.label} colors={fluid.colors} colorLabels={fluid.colorLabels}
                  level={state.level} colorIdx={state.colorIdx}
                  onLevelChange={v=>onUpdate({level:v})} onColorChange={v=>onUpdate({colorIdx:v})}/>
              </div>

              {/* Status buttons */}
              <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:10 }}>
                {["Pass","Monitor","Service Now"].map(s => (
                  <button key={s} onClick={() => onUpdate({status:s})} style={{
                    flex:1, minWidth:80, padding:"6px 8px", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer", transition:"all 0.2s",
                    background: state.status===s ? s==="Pass"?"#166534":s==="Monitor"?"#854d0e":"#7f1d1d" : "#0f172a",
                    border: `1.5px solid ${state.status===s ? s==="Pass"?"#22c55e":s==="Monitor"?"#eab308":"#ef4444" : "#334155"}`,
                    color: state.status===s ? s==="Pass"?"#bbf7d0":s==="Monitor"?"#fef08a":"#fecaca" : "#64748b",
                  }}>{s==="Pass"?"✅":s==="Monitor"?"⚠️":"🚨"} {s}</button>
                ))}
              </div>
              <div style={{ fontSize:10, color:"#475569", marginBottom:14, lineHeight:1.5 }}>💡 {fluid.notes}</div>

              {/* ── OIL INSPECTION CHECKS ── */}
              <div style={{ borderTop:"1px solid #334155", paddingTop:14, marginBottom:4 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:12 }}>
                  🔬 Detailed Oil Inspection Checks
                </div>
                {OIL_CHECKS.map(check => (
                  <OilCheckRow
                    key={check.id}
                    check={check}
                    selected={state.oilChecks?.[check.id] || ""}
                    onSelect={val => onUpdate({ oilChecks: { ...state.oilChecks, [check.id]: val } })}
                  />
                ))}
              </div>
            </>
          )}

          <textarea value={state.note} onChange={e => onUpdate({note:e.target.value})}
            placeholder="Tech notes (optional)..."
            style={{ width:"100%", boxSizing:"border-box", background:"#0f172a", border:"1.5px solid #334155", borderRadius:8, padding:"7px 10px", color:"#94a3b8", fontSize:11, resize:"vertical", minHeight:48, outline:"none", marginTop:"auto" }}/>
        </>
      )}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ step, title, complete }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
      <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0, background:complete?"#166534":"#1e293b", border:`2px solid ${complete?"#22c55e":"#334155"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:complete?"#bbf7d0":"#64748b" }}>
        {complete ? "✓" : step}
      </div>
      <div>
        <div style={{ fontWeight:800, fontSize:15, color:"#f1f5f9" }}>{title}</div>
        <div style={{ fontSize:11, color:complete?"#22c55e":"#64748b" }}>{complete ? "Complete ✓" : "Required to proceed"}</div>
      </div>
    </div>
  );
}

// ─── Print Modal ──────────────────────────────────────────────────────────────
function PrintModal({ info, miles, fluidStates, onClose }) {
  const date = new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
  const rows = FLUIDS.filter(f => fluidStates[f.id]?.toggled).map(f => {
    const s = fluidStates[f.id];
    // Build oil checks summary
    const checks = OIL_CHECKS.map(c => {
      const val = s.oilChecks?.[c.id];
      if (!val) return null;
      const opt = c.options.find(o => o.value === val);
      return opt ? { label: c.label, icon: c.icon, selected: opt.label, color: opt.color, hint: opt.hint } : null;
    }).filter(Boolean);
    return {
      fluid:f.label, icon:f.icon,
      status: s.alreadyDone ? "Already Serviced" : s.status || "—",
      condition: f.colorLabels[s.colorIdx||0], level: s.level+"%",
      note: s.note, alreadyDone: s.alreadyDone,
      rec: mileRec(f, miles)?.msg || "—",
      checks,
    };
  });

  const handlePrint = () => {
    const win = window.open("","_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>Engine Oil Inspection — ${info.year} ${info.make} ${info.model}</title>
<style>*{box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;margin:0;padding:32px;color:#0f172a;background:#fff}
h1{margin:0 0 2px;font-size:24px}.sub{color:#64748b;font-size:12px;margin-bottom:20px;border-bottom:2px solid #e2e8f0;padding-bottom:12px}
.ig{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px 24px;background:#f8fafc;border-radius:10px;padding:16px;margin-bottom:20px}
.kv label{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;font-weight:700;display:block}.kv span{font-size:13px;font-weight:600}
table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px}
th{background:#0f172a;color:#fff;padding:9px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em}
td{padding:9px 10px;border-bottom:1px solid #e2e8f0;vertical-align:top}tr:nth-child(even)td{background:#f8fafc}
.pass{color:#16a34a;font-weight:700}.mon{color:#ca8a04;font-weight:700}.svc{color:#dc2626;font-weight:700}.done{color:#2563eb;font-weight:700}
.checks-title{font-size:13px;font-weight:700;color:#0f172a;margin:20px 0 10px;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
.check-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px}
.check-item{background:#f8fafc;border-radius:8px;padding:10px 12px;border-left:3px solid #e2e8f0}
.check-item .cl{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;font-weight:700;margin-bottom:3px}
.check-item .cv{font-size:12px;font-weight:700;margin-bottom:3px}
.check-item .ch{font-size:10px;color:#64748b}
.footer{margin-top:24px;font-size:10px;color:#94a3b8;padding-top:12px;border-top:1px solid #e2e8f0}</style></head><body>
<h1>🛢️ Engine Oil Inspection Report</h1>
<div class="sub">Date: ${date} &nbsp;|&nbsp; Mileage: ${parseInt(miles).toLocaleString()} mi &nbsp;|&nbsp; Tech: ${info.techName}</div>
<div class="ig">
<div class="kv"><label>Customer</label><span>${info.custName}</span></div>
<div class="kv"><label>Phone</label><span>${info.custPhone}</span></div>
<div class="kv"><label>Email</label><span>${info.custEmail}</span></div>
<div class="kv"><label>Address</label><span>${info.custAddress}</span></div>
<div class="kv"><label>Vehicle</label><span>${info.year} ${info.make} ${info.model}</span></div>
<div class="kv"><label>VIN</label><span>${info.vin}</span></div>
</div>
<table><thead><tr><th>Fluid</th><th>Overall Status</th><th>Level</th><th>Color/Condition</th><th>Mile Recommendation</th><th>Tech Notes</th></tr></thead>
<tbody>${rows.map(r=>`<tr><td><strong>${r.icon} ${r.fluid}</strong></td><td class="${r.alreadyDone?"done":r.status==="Pass"?"pass":r.status==="Monitor"?"mon":"svc"}">${r.status}</td><td>${r.level}</td><td>${r.condition}</td><td style="font-size:10px">${r.rec}</td><td style="font-size:10px;color:#64748b">${r.note||"—"}</td></tr>`).join("")}</tbody></table>
${rows.map(r => r.checks.length > 0 ? `
<div class="checks-title">🔬 Detailed Oil Inspection — ${r.fluid}</div>
<div class="check-grid">
${r.checks.map(c=>`<div class="check-item" style="border-left-color:${c.color}">
  <div class="cl">${c.icon} ${c.label}</div>
  <div class="cv" style="color:${c.color}">${c.selected}</div>
  <div class="ch">${c.hint}</div>
</div>`).join("")}
</div>` : "").join("")}
<div class="footer">Generated by Vehicle Engine Oil Inspection System · ${date}</div>
</body></html>`);
    win.document.close(); win.print();
  };

  const handleEmail = () => {
    const subj = `Engine Oil Inspection — ${info.year} ${info.make} ${info.model}`;
    const checksText = rows.flatMap(r => r.checks.map(c => `  ${c.icon} ${c.label}: ${c.selected}`)).join("\n");
    const body = [
      "ENGINE OIL INSPECTION REPORT", `Date: ${date}`,
      `Customer: ${info.custName}`, `Phone: ${info.custPhone}`,
      `Vehicle: ${info.year} ${info.make} ${info.model}`, `VIN: ${info.vin}`,
      `Mileage: ${parseInt(miles).toLocaleString()} mi`, `Tech: ${info.techName}`,
      "", "--- OIL LEVEL & CONDITION ---",
      ...rows.map(r=>`${r.icon} ${r.fluid}: ${r.status} | Level: ${r.level} | ${r.condition}${r.note?` | Note: ${r.note}`:""}`),
      "", "--- DETAILED INSPECTION CHECKS ---",
      checksText || "  No checks recorded",
    ].join("\n");
    window.location.href = `mailto:${info.custEmail}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000d", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#0f172a", borderRadius:18, width:"100%", maxWidth:640, maxHeight:"90vh", overflowY:"auto", padding:28, position:"relative" }}>
        <button onClick={onClose} style={{ position:"absolute", top:14, right:14, background:"#1e293b", border:"1.5px solid #334155", color:"#f1f5f9", borderRadius:8, padding:"5px 12px", cursor:"pointer", fontWeight:700, fontSize:12 }}>✕</button>
        <h2 style={{ color:"#f1f5f9", margin:"0 0 4px", fontSize:20 }}>🛢️ Engine Oil Inspection Report</h2>
        <div style={{ color:"#64748b", fontSize:12, marginBottom:18 }}>{date} · {parseInt(miles).toLocaleString()} mi</div>

        {/* Vehicle summary */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 20px", background:"#1e293b", borderRadius:12, padding:14, marginBottom:18 }}>
          {[["Customer",info.custName],["Phone",info.custPhone],["Email",info.custEmail],["Address",info.custAddress],["Vehicle",`${info.year} ${info.make} ${info.model}`],["VIN",info.vin],["Tech",info.techName]].map(([k,v])=>(
            <div key={k}><div style={{ fontSize:9, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:700 }}>{k}</div><div style={{ fontSize:13, color:"#f1f5f9", fontWeight:600 }}>{v||"—"}</div></div>
          ))}
        </div>

        {/* Oil level summary */}
        {rows.map(r=>(
          <div key={r.fluid} style={{ background:"#1e293b", borderRadius:10, padding:"10px 14px", marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <div style={{ fontWeight:700, color:"#f1f5f9", fontSize:13 }}>{r.icon} {r.fluid}</div>
              <div style={{ fontWeight:700, fontSize:12, color:r.alreadyDone?"#60a5fa":r.status==="Pass"?"#22c55e":r.status==="Monitor"?"#eab308":"#ef4444" }}>{r.status}</div>
            </div>
            <div style={{ fontSize:11, color:"#94a3b8", marginBottom:r.checks.length>0?10:0 }}>Level: {r.level} · {r.condition}{r.note?` · ${r.note}`:""}</div>
            {/* Checks grid */}
            {r.checks.length > 0 && (
              <div style={{ borderTop:"1px solid #334155", paddingTop:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>🔬 Inspection Checks</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  {r.checks.map(c=>(
                    <div key={c.label} style={{ background:"#0f172a", borderRadius:7, padding:"7px 9px", borderLeft:`3px solid ${c.color}` }}>
                      <div style={{ fontSize:9, color:"#64748b", fontWeight:700, textTransform:"uppercase", marginBottom:2 }}>{c.icon} {c.label}</div>
                      <div style={{ fontSize:11, color:c.color, fontWeight:700 }}>{c.selected}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <button onClick={handlePrint} style={{ flex:1, background:"#1d4ed8", color:"#fff", border:"none", borderRadius:10, padding:"12px", fontSize:13, fontWeight:700, cursor:"pointer", minWidth:130 }}>🖨️ Print Report</button>
          <button onClick={handleEmail} style={{ flex:1, background:"#15803d", color:"#fff", border:"none", borderRadius:10, padding:"12px", fontSize:13, fontWeight:700, cursor:"pointer", minWidth:130 }}>📧 Email Customer</button>
          <button onClick={() => { handlePrint(); setTimeout(handleEmail, 600); }} style={{ flex:"0 0 100%", background:"#7c3aed", color:"#fff", border:"none", borderRadius:10, padding:"12px", fontSize:13, fontWeight:700, cursor:"pointer" }}>📋 Print + Email Both</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [info, setInfo] = useState({ custName:"", custPhone:"", custEmail:"", custAddress:"", year:"", make:"", model:"", vin:"", techName:"" });
  const [miles, setMiles] = useState("");
  const [vehiclePhotos, setVehiclePhotos] = useState({});
  const [wheelPhotos, setWheelPhotos] = useState({});
  const [fluidPhotos, setFluidPhotos] = useState({});
  const [vinLoading, setVinLoading] = useState(false);
  const [vinResult, setVinResult] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [fluidStates, setFluidStates] = useState(
    Object.fromEntries(FLUIDS.map(f => [f.id, {
      toggled:true, alreadyDone:false, level:70, colorIdx:0, status:"", note:"",
      oilChecks: Object.fromEntries(OIL_CHECKS.map(c => [c.id, ""]))
    }]))
  );

  const upInfo  = (k, v) => setInfo(p => ({ ...p, [k]:v }));
  const upFluid = (id, p) => setFluidStates(s => ({ ...s, [id]:{ ...s[id], ...p } }));

  // ── VIN lookup via NHTSA (with no-cors fallback) ──
  const lookupVin = async () => {
    if (!isValidVin(info.vin)) return;
    setVinLoading(true); setVinResult(null);
    try {
      const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${info.vin.trim()}?format=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Network error");
      const data = await res.json();
      const v = data.Results?.[0];
      if (v && v.Make && v.Make !== "0" && v.Make !== "") {
        setVinResult(v);
        if (v.ModelYear && v.ModelYear !== "0") upInfo("year", v.ModelYear);
        if (v.Make)  upInfo("make",  v.Make.charAt(0).toUpperCase() + v.Make.slice(1).toLowerCase());
        if (v.Model) upInfo("model", v.Model.charAt(0).toUpperCase() + v.Model.slice(1).toLowerCase());
      } else {
        setVinResult({ error: true, msg: "No vehicle found for this VIN" });
      }
    } catch (e) {
      setVinResult({ error: true, msg: "VIN lookup failed — check your connection or enter manually" });
    }
    setVinLoading(false);
  };

  // ── Completeness ──
  const allVehiclePhotos = VEHICLE_ANGLES.every(a => vehiclePhotos[a.id]);
  const allWheelPhotos   = WHEEL_SPOTS.every(w => wheelPhotos[w.id]);
  const allFluidPhotos   = FLUIDS.filter(f => fluidStates[f.id]?.toggled).every(f => fluidPhotos[f.id]);
  const infoValid = isValidName(info.custName) && isValidPhone(info.custPhone) &&
    isValidEmail(info.custEmail) && isValidAddress(info.custAddress) &&
    isValidYear(info.year) && isValidMake(info.make) && isValidModel(info.model) &&
    isValidVin(info.vin) && isValidText(info.techName) && isValidMiles(miles);
  const canGenerate = infoValid && allVehiclePhotos && allWheelPhotos && allFluidPhotos;

  const highPri = isValidMiles(miles) ? FLUIDS.filter(f => {
    const r = mileRec(f, miles); return r?.status==="overdue" || r?.status==="soon";
  }) : [];

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#020617 0%,#0f172a 50%,#020617 100%)", fontFamily:"'DM Sans','Segoe UI',sans-serif", color:"#f1f5f9", padding:"20px 14px" }}>
      <div style={{ maxWidth:960, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:42, marginBottom:6 }}>🛢️</div>
          <h1 style={{ margin:0, fontSize:"clamp(22px,5vw,32px)", fontWeight:900, letterSpacing:"-0.02em", color:"#f8fafc" }}>Vehicle Engine Oil Inspection</h1>
          <p style={{ color:"#64748b", margin:"6px 0 0", fontSize:13 }}>360° documentation · Full oil analysis · Smell · Viscosity · Contamination · Mile-based recommendations</p>
        </div>

        {/* Progress */}
        <div style={{ background:"#1e293b", borderRadius:12, padding:"12px 16px", marginBottom:18, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          {[
            { l:"Customer Info", d:infoValid },
            { l:"360° Photos",   d:allVehiclePhotos },
            { l:"Wheel Photos",  d:allWheelPhotos },
            { l:"Fluid Photos",  d:allFluidPhotos },
          ].map((s, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:20, height:20, borderRadius:"50%", background:s.d?"#166534":"#334155", border:`2px solid ${s.d?"#22c55e":"#475569"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:s.d?"#bbf7d0":"#64748b", flexShrink:0, fontWeight:800 }}>{s.d?"✓":i+1}</div>
              <span style={{ fontSize:11, color:s.d?"#bbf7d0":"#64748b", fontWeight:s.d?700:400 }}>{s.l}</span>
              {i < 3 && <span style={{ color:"#334155", margin:"0 2px", fontSize:14 }}>›</span>}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Customer & Vehicle Info ── */}
        <div style={{ background:"#1e293b", borderRadius:18, padding:22, marginBottom:16, border:"1.5px solid #334155" }}>
          <SectionHeader step={1} title="Customer & Vehicle Information" complete={infoValid}/>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))", gap:12, marginBottom:12 }}>
            <FieldBox label="Customer Name"  value={info.custName}  onChange={v=>upInfo("custName",v)}  placeholder="Full name"       validate={isValidName}    hint={v=>/\d/.test(v)?"Names cannot contain numbers":null}/>
            <FieldBox label="Phone"          value={info.custPhone} onChange={v=>upInfo("custPhone",v)} placeholder="(555) 555-5555"  validate={isValidPhone}/>
            <FieldBox label="Email"          value={info.custEmail} onChange={v=>upInfo("custEmail",v)} placeholder="email@example.com" validate={isValidEmail} type="email"/>
            <div style={{ gridColumn:"1/-1" }}>
              <FieldBox label="Address" value={info.custAddress} onChange={v=>upInfo("custAddress",v)} placeholder="123 Main St, City, State ZIP" validate={isValidAddress}/>
            </div>
            <FieldBox label="Year"  value={info.year}  onChange={v=>upInfo("year",v)}  placeholder="2019" validate={isValidYear} hint={v=>v.trim().length>0&&!isValidYear(v)?"Enter a valid year (1980–present)":null}/>
            <FieldBox label="Make"  value={info.make}  onChange={v=>upInfo("make",v)}  placeholder="Toyota, Ford…" validate={isValidMake}  hint={getMakeHint}/>
            <FieldBox label="Model" value={info.model} onChange={v=>upInfo("model",v)} placeholder="Camry, F-150…" validate={isValidModel} hint={v=>/^\d+$/.test(v.trim())?"Model cannot be only numbers":null}/>
            <FieldBox label="Mileage"    value={miles}          onChange={setMiles}              placeholder="95000"    validate={isValidMiles}/>
            <FieldBox label="Technician" value={info.techName}  onChange={v=>upInfo("techName",v)} placeholder="Tech name" validate={isValidText}/>
          </div>

          {/* VIN row */}
          <div>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.09em", color:"#94a3b8", textTransform:"uppercase", marginBottom:4 }}>
              VIN Number <span style={{ color:"#f87171" }}>*</span>
              <span style={{ fontSize:9, color:"#475569", fontWeight:400, marginLeft:8, textTransform:"none", letterSpacing:0 }}>17 characters required</span>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <input
                value={info.vin}
                onChange={e => upInfo("vin", e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g,""))}
                placeholder="1HGBH41JXMN109186"
                maxLength={17}
                style={{
                  flex:1,
                  background: isValidVin(info.vin) ? "#f0fdf4" : info.vin.length > 0 ? "#fef2f2" : "#1e293b",
                  border: `2px solid ${isValidVin(info.vin) ? "#22c55e" : info.vin.length > 0 ? "#ef4444" : "#334155"}`,
                  borderRadius:8, padding:"9px 11px",
                  color: isValidVin(info.vin) ? "#166534" : info.vin.length > 0 ? "#991b1b" : "#f1f5f9",
                  fontSize:13, outline:"none", fontFamily:"monospace", letterSpacing:"0.12em",
                }}
              />
              <button onClick={lookupVin} disabled={!isValidVin(info.vin) || vinLoading}
                style={{ background: isValidVin(info.vin)?"#1d4ed8":"#1e293b", color: isValidVin(info.vin)?"#fff":"#475569", border:"none", borderRadius:8, padding:"9px 16px", fontSize:12, fontWeight:700, cursor: isValidVin(info.vin)?"pointer":"not-allowed", whiteSpace:"nowrap", transition:"all 0.2s" }}>
                {vinLoading ? "⏳ Looking up…" : "🔍 Decode VIN"}
              </button>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
              <span style={{ fontSize:10, color: isValidVin(info.vin)?"#22c55e":info.vin.length>0?"#f87171":"#475569" }}>
                {info.vin.length}/17 characters
                {isValidVin(info.vin) ? " ✓" : info.vin.length > 0 ? ` — need ${17-info.vin.length} more` : ""}
              </span>
            </div>
            {vinResult && !vinResult.error && (
              <div style={{ marginTop:6, fontSize:11, color:"#22c55e", background:"#052e16", borderRadius:8, padding:"8px 12px", lineHeight:1.5 }}>
                ✅ <strong>{vinResult.ModelYear} {vinResult.Make} {vinResult.Model}</strong>
                {vinResult.BodyClass ? ` — ${vinResult.BodyClass}` : ""}
                {vinResult.EngineCylinders ? ` · ${vinResult.EngineCylinders}-cyl` : ""}
              </div>
            )}
            {vinResult?.error && (
              <div style={{ marginTop:6, fontSize:11, color:"#f87171", background:"#1c0a0a", borderRadius:8, padding:"7px 10px" }}>
                ❌ {vinResult.msg}
              </div>
            )}
          </div>
        </div>

        {/* ── STEP 2: 360° Vehicle Photos ── */}
        <div style={{ background:"#1e293b", borderRadius:18, padding:22, marginBottom:16, border:`1.5px solid ${allVehiclePhotos?"#22c55e":"#334155"}` }}>
          <SectionHeader step={2} title="360° Vehicle Documentation" complete={allVehiclePhotos}/>
          <p style={{ fontSize:12, color:"#64748b", margin:"0 0 14px", lineHeight:1.5 }}>Required for liability protection. Capture all four sides before service begins.</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
            {VEHICLE_ANGLES.map(a => (
              <PhotoTile key={a.id} label={a.label} icon={a.icon} desc={a.desc}
                photo={vehiclePhotos[a.id]} onCapture={p=>setVehiclePhotos(v=>({...v,[a.id]:p}))}/>
            ))}
          </div>
        </div>

        {/* ── STEP 3: Wheel Photos ── */}
        <div style={{ background:"#1e293b", borderRadius:18, padding:22, marginBottom:16, border:`1.5px solid ${allWheelPhotos?"#22c55e":"#334155"}` }}>
          <SectionHeader step={3} title="Wheel & Tire Documentation" complete={allWheelPhotos}/>
          <p style={{ fontSize:12, color:"#64748b", margin:"0 0 14px", lineHeight:1.5 }}>Document all four wheels — tire condition, tread depth, and visible damage.</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
            {WHEEL_SPOTS.map(w => (
              <PhotoTile key={w.id} label={w.label} icon={w.icon} desc="Full wheel + tire"
                photo={wheelPhotos[w.id]} onCapture={p=>setWheelPhotos(v=>({...v,[w.id]:p}))}/>
            ))}
          </div>
        </div>

        {/* ── Mile alert ── */}
        {highPri.length > 0 && isValidMiles(miles) && (
          <div style={{ background:"linear-gradient(135deg,#7c1a1a,#431407)", border:"1.5px solid #ef4444", borderRadius:14, padding:"12px 18px", marginBottom:16 }}>
            <div style={{ fontWeight:800, color:"#fca5a5", fontSize:13, marginBottom:6 }}>🚨 Mile-Based Alerts — {parseInt(miles).toLocaleString()} mi</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {highPri.map(f => {
                const r = mileRec(f, miles);
                return <span key={f.id} style={{ background:r.status==="overdue"?"#7f1d1d":"#713f12", color:r.status==="overdue"?"#fecaca":"#fef08a", padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700 }}>{f.icon} {f.label}</span>;
              })}
            </div>
          </div>
        )}

        {/* ── STEP 4: Fluid Inspection ── */}
        <div style={{ background:"#1e293b", borderRadius:18, padding:22, marginBottom:16, border:`1.5px solid ${allFluidPhotos?"#22c55e":"#334155"}` }}>
          <SectionHeader step={4} title="Engine Oil Inspection" complete={allFluidPhotos}/>
          <p style={{ fontSize:12, color:"#64748b", margin:"0 0 14px", lineHeight:1.5 }}>Upload a photo of the dipstick, then complete all inspection checks below.</p>

          {/* Fluid photo tiles */}
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>
              Fluid Photos — required for each inspected fluid
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))", gap:10 }}>
              {FLUIDS.filter(f => fluidStates[f.id]?.toggled).map(f => (
                <PhotoTile key={f.id} label={f.label} icon={f.icon} desc="" compact
                  photo={fluidPhotos[f.id]} onCapture={p=>setFluidPhotos(v=>({...v,[f.id]:p}))}/>
              ))}
            </div>
          </div>

          {/* Fluid cards */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:16, alignItems:"start" }}>
            {FLUIDS.map(f => (
              <FluidCard key={f.id} fluid={f} miles={miles}
                state={fluidStates[f.id]} onUpdate={p=>upFluid(f.id,p)}
                photoUploaded={!!fluidPhotos[f.id]}/>
            ))}
          </div>
        </div>

        {/* ── Report Button ── */}
        {canGenerate ? (
          <button onClick={() => setShowReport(true)} style={{ width:"100%", background:"linear-gradient(135deg,#1d4ed8,#7c3aed)", color:"#fff", border:"none", borderRadius:14, padding:"16px 32px", fontSize:15, fontWeight:800, cursor:"pointer", letterSpacing:"0.02em", boxShadow:"0 8px 32px #1d4ed855" }}>
            📋 Generate Inspection Report — Print &amp; Email
          </button>
        ) : (
          <div style={{ background:"#1e293b", border:"2px dashed #334155", borderRadius:14, padding:"16px 20px", textAlign:"center", fontSize:13, color:"#475569", fontWeight:700 }}>
            🔒 Complete all 4 steps to unlock the report
            <div style={{ fontSize:11, color:"#374151", marginTop:5, fontWeight:400, lineHeight:1.7 }}>
              {!infoValid        && "• Fill in all customer & vehicle fields — check for spelling errors in Make/Model   "}
              {!allVehiclePhotos && "• Upload all 4 vehicle angle photos   "}
              {!allWheelPhotos   && "• Upload all 4 wheel photos   "}
              {!allFluidPhotos   && "• Upload a fluid photo for each inspected fluid"}
            </div>
          </div>
        )}

        <div style={{ height:40 }}/>
      </div>

      {showReport && <PrintModal info={info} miles={miles} fluidStates={fluidStates} onClose={()=>setShowReport(false)}/>}
    </div>
  );
}
