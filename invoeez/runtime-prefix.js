
/* Icons inlined from lucide-static (ISC licence). No network access required. */
var React = window.React;
var useState = React.useState,
  useMemo = React.useMemo;
var __P = {
  "LayoutDashboard": "<rect width=\"7\" height=\"9\" x=\"3\" y=\"3\" rx=\"1\" /> <rect width=\"7\" height=\"5\" x=\"14\" y=\"3\" rx=\"1\" /> <rect width=\"7\" height=\"9\" x=\"14\" y=\"12\" rx=\"1\" /> <rect width=\"7\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\" />",
  "FileText": "<path d=\"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z\" /> <path d=\"M14 2v5a1 1 0 0 0 1 1h5\" /> <path d=\"M10 9H8\" /> <path d=\"M16 13H8\" /> <path d=\"M16 17H8\" />",
  "FileMinus": "<path d=\"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z\" /> <path d=\"M14 2v5a1 1 0 0 0 1 1h5\" /> <path d=\"M9 15h6\" />",
  "FilePlus": "<path d=\"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z\" /> <path d=\"M14 2v5a1 1 0 0 0 1 1h5\" /> <path d=\"M9 15h6\" /> <path d=\"M12 18v-6\" />",
  "ShoppingCart": "<circle cx=\"8\" cy=\"21\" r=\"1\" /> <circle cx=\"19\" cy=\"21\" r=\"1\" /> <path d=\"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12\" />",
  "Wallet": "<path d=\"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1\" /> <path d=\"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4\" />",
  "Users": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\" /> <path d=\"M16 3.128a4 4 0 0 1 0 7.744\" /> <path d=\"M22 21v-2a4 4 0 0 0-3-3.87\" /> <circle cx=\"9\" cy=\"7\" r=\"4\" />",
  "Package": "<path d=\"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z\" /> <path d=\"M12 22V12\" /> <polyline points=\"3.29 7 12 12 20.71 7\" /> <path d=\"m7.5 4.27 9 5.15\" />",
  "BookOpen": "<path d=\"M12 5v16\" /> <path d=\"M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z\" />",
  "Landmark": "<path d=\"M10 18v-7\" /> <path d=\"M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z\" /> <path d=\"M14 18v-7\" /> <path d=\"M18 18v-7\" /> <path d=\"M3 22h18\" /> <path d=\"M6 18v-7\" />",
  "Layers": "<path d=\"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z\" /> <path d=\"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12\" /> <path d=\"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17\" />",
  "Receipt": "<path d=\"M12 17V7\" /> <path d=\"M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8\" /> <path d=\"M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z\" />",
  "Scale": "<path d=\"M12 3v18\" /> <path d=\"m19 8 3 8a5 5 0 0 1-6 0zV7\" /> <path d=\"M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1\" /> <path d=\"m5 8 3 8a5 5 0 0 1-6 0zV7\" /> <path d=\"M7 21h10\" />",
  "Building2": "<path d=\"M10 12h4\" /> <path d=\"M10 8h4\" /> <path d=\"M14 21v-3a2 2 0 0 0-4 0v3\" /> <path d=\"M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2\" /> <path d=\"M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16\" />",
  "BarChart3": "<path d=\"M3 3v16a2 2 0 0 0 2 2h16\" /> <path d=\"M18 17V9\" /> <path d=\"M13 17V5\" /> <path d=\"M8 17v-3\" />",
  "CircleDot": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <circle cx=\"12\" cy=\"12\" r=\"1\" />",
  "Plus": "<path d=\"M5 12h14\" /> <path d=\"M12 5v14\" />",
  "Search": "<path d=\"m21 21-4.34-4.34\" /> <circle cx=\"11\" cy=\"11\" r=\"8\" />",
  "Printer": "<path d=\"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2\" /> <path d=\"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6\" /> <rect x=\"6\" y=\"14\" width=\"12\" height=\"8\" rx=\"1\" />",
  "Trash2": "<path d=\"M10 11v6\" /> <path d=\"M14 11v6\" /> <path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6\" /> <path d=\"M3 6h18\" /> <path d=\"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\" />",
  "Check": "<path d=\"M20 6 9 17l-5-5\" />",
  "X": "<path d=\"M18 6 6 18\" /> <path d=\"m6 6 12 12\" />",
  "ChevronRight": "<path d=\"m9 18 6-6-6-6\" />",
  "ArrowLeft": "<path d=\"m12 19-7-7 7-7\" /> <path d=\"M19 12H5\" />",
  "AlertTriangle": "<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\" /> <path d=\"M12 9v4\" /> <path d=\"M12 17h.01\" />",
  "TrendingUp": "<path d=\"M16 7h6v6\" /> <path d=\"m22 7-8.5 8.5-5-5L2 17\" />",
  "TrendingDown": "<path d=\"M16 17h6v-6\" /> <path d=\"m22 17-8.5-8.5-5 5L2 7\" />",
  "Download": "<path d=\"M12 15V3\" /> <path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\" /> <path d=\"m7 10 5 5 5-5\" />",
  "Upload": "<path d=\"M12 3v12\" /> <path d=\"m17 8-5-5-5 5\" /> <path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\" />",
  "RotateCcw": "<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\" /> <path d=\"M3 3v5h5\" />",
  "Inbox": "<polyline points=\"22 12 16 12 14 15 10 15 8 12 2 12\" /> <path d=\"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z\" />",
  "Banknote": "<rect width=\"20\" height=\"12\" x=\"2\" y=\"6\" rx=\"2\" /> <circle cx=\"12\" cy=\"12\" r=\"2\" /> <path d=\"M6 12h.01M18 12h.01\" />",
  "Calendar": "<path d=\"M8 2v3\" /> <path d=\"M16 2v3\" /> <rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" /> <path d=\"M3 9h18\" />",
  "ChevronsLeft": "<path d=\"m11 17-5-5 5-5\" /> <path d=\"m18 17-5-5 5-5\" />",
  "ChevronsRight": "<path d=\"m6 17 5-5-5-5\" /> <path d=\"m13 17 5-5-5-5\" />",
  "ArrowUpRight": "<path d=\"M7 7h10v10\" /> <path d=\"M7 17 17 7\" />",
  "ArrowDownLeft": "<path d=\"M17 7 7 17\" /> <path d=\"M17 17H7V7\" />",
  "ChevronUp": "<path d=\"m18 15-6-6-6 6\" />",
  "ChevronDown": "<path d=\"m6 9 6 6 6-6\" />",
  "Sun": "<circle cx=\"12\" cy=\"12\" r=\"4\" /> <path d=\"M12 2v2\" /> <path d=\"M12 20v2\" /> <path d=\"m4.93 4.93 1.41 1.41\" /> <path d=\"m17.66 17.66 1.41 1.41\" /> <path d=\"M2 12h2\" /> <path d=\"M20 12h2\" /> <path d=\"m6.34 17.66-1.41 1.41\" /> <path d=\"m19.07 4.93-1.41 1.41\" />",
  "Moon": "<path d=\"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401\" />",
  "Pencil": "<path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\" /> <path d=\"m15 5 4 4\" />",
  "ArrowRight": "<path d=\"M5 12h14\" /> <path d=\"m12 5 7 7-7 7\" />",
  "CircleCheck": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"m9 12 2 2 4-4\" />",
  "Clock": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"M12 6v6l4 2\" />",
  "Percent": "<line x1=\"19\" x2=\"5\" y1=\"5\" y2=\"19\" /> <circle cx=\"6.5\" cy=\"6.5\" r=\"2.5\" /> <circle cx=\"17.5\" cy=\"17.5\" r=\"2.5\" />",
  "Boxes": "<path d=\"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z\" /> <path d=\"m7 16.5-4.74-2.85\" /> <path d=\"m7 16.5 5-3\" /> <path d=\"M7 16.5v5.17\" /> <path d=\"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z\" /> <path d=\"m17 16.5-5-3\" /> <path d=\"m17 16.5 4.74-2.85\" /> <path d=\"M17 16.5v5.17\" /> <path d=\"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z\" /> <path d=\"M12 8 7.26 5.15\" /> <path d=\"m12 8 4.74-2.85\" /> <path d=\"M12 13.5V8\" />",
  "Settings": "<path d=\"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915\" /> <circle cx=\"12\" cy=\"12\" r=\"3\" />",
  "ShieldCheck": "<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\" /> <path d=\"m9 12 2 2 4-4\" />",
  "Link2": "<path d=\"M9 17H7A5 5 0 0 1 7 7h2\" /> <path d=\"M15 7h2a5 5 0 1 1 0 10h-2\" /> <line x1=\"8\" x2=\"16\" y1=\"12\" y2=\"12\" />",
  "FileCode": "<path d=\"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z\" /> <path d=\"M14 2v5a1 1 0 0 0 1 1h5\" /> <path d=\"M10 12.5 8 15l2 2.5\" /> <path d=\"m14 12.5 2 2.5-2 2.5\" />",
  "CloudUpload": "<path d=\"M12 13v8\" /> <path d=\"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242\" /> <path d=\"m8 17 4-4 4 4\" />",
  "ImagePlus": "<path d=\"M16 5h6\" /> <path d=\"M19 2v6\" /> <path d=\"M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5\" /> <path d=\"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21\" /> <circle cx=\"9\" cy=\"9\" r=\"2\" />",
  "CircleAlert": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <line x1=\"12\" x2=\"12\" y1=\"8\" y2=\"12\" /> <line x1=\"12\" x2=\"12.01\" y1=\"16\" y2=\"16\" />",
  "ExternalLink": "<path d=\"M15 3h6v6\" /> <path d=\"M10 14 21 3\" /> <path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\" />",
  "FileDown": "<path d=\"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z\" /> <path d=\"M14 2v5a1 1 0 0 0 1 1h5\" /> <path d=\"M12 18v-6\" /> <path d=\"m9 15 3 3 3-3\" />",
  "Sheet": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" ry=\"2\" /> <line x1=\"3\" x2=\"21\" y1=\"9\" y2=\"9\" /> <line x1=\"3\" x2=\"21\" y1=\"15\" y2=\"15\" /> <line x1=\"9\" x2=\"9\" y1=\"9\" y2=\"21\" /> <line x1=\"15\" x2=\"15\" y1=\"9\" y2=\"21\" />",
  "Mail": "<path d=\"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7\" /> <rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\" />",
  "MessageCircle": "<path d=\"M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719\" />",
  "Send": "<path d=\"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z\" /> <path d=\"m21.854 2.147-10.94 10.939\" />",
  "BookPlus": "<path d=\"M12 7v6\" /> <path d=\"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20\" /> <path d=\"M9 10h6\" />",
  "Copy": "<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\" /> <path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\" />",
  "Zap": "<path d=\"M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z\" />",
  "Bell": "<path d=\"M10.268 21a2 2 0 0 0 3.464 0\" /> <path d=\"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326\" />",
  "Menu": "<path d=\"M4 5h16\" /> <path d=\"M4 12h16\" /> <path d=\"M4 19h16\" />"
};
function __mk(inner) {
  return function (p) {
    p = p || {};
    var s = p.size || 16;
    return React.createElement("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      width: s,
      height: s,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: p.strokeWidth || 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: p.style,
      className: p.className,
      "aria-hidden": "true",
      dangerouslySetInnerHTML: {
        __html: inner
      }
    });
  };
}
var LayoutDashboard = __mk(__P["LayoutDashboard"]);
var FileText = __mk(__P["FileText"]);
var FileMinus = __mk(__P["FileMinus"]);
var FilePlus = __mk(__P["FilePlus"]);
var ShoppingCart = __mk(__P["ShoppingCart"]);
var Wallet = __mk(__P["Wallet"]);
var Users = __mk(__P["Users"]);
var Package = __mk(__P["Package"]);
var BookOpen = __mk(__P["BookOpen"]);
var Landmark = __mk(__P["Landmark"]);
var Layers = __mk(__P["Layers"]);
var Receipt = __mk(__P["Receipt"]);
var Scale = __mk(__P["Scale"]);
var Building2 = __mk(__P["Building2"]);
var BarChart3 = __mk(__P["BarChart3"]);
var CircleDot = __mk(__P["CircleDot"]);
var Plus = __mk(__P["Plus"]);
var Search = __mk(__P["Search"]);
var Printer = __mk(__P["Printer"]);
var Trash2 = __mk(__P["Trash2"]);
var Check = __mk(__P["Check"]);
var X = __mk(__P["X"]);
var ChevronRight = __mk(__P["ChevronRight"]);
var ArrowLeft = __mk(__P["ArrowLeft"]);
var AlertTriangle = __mk(__P["AlertTriangle"]);
var TrendingUp = __mk(__P["TrendingUp"]);
var TrendingDown = __mk(__P["TrendingDown"]);
var Download = __mk(__P["Download"]);
var Upload = __mk(__P["Upload"]);
var RotateCcw = __mk(__P["RotateCcw"]);
var Inbox = __mk(__P["Inbox"]);
var Banknote = __mk(__P["Banknote"]);
var Calendar = __mk(__P["Calendar"]);
var ChevronsLeft = __mk(__P["ChevronsLeft"]);
var ChevronsRight = __mk(__P["ChevronsRight"]);
var ArrowUpRight = __mk(__P["ArrowUpRight"]);
var ArrowDownLeft = __mk(__P["ArrowDownLeft"]);
var ChevronUp = __mk(__P["ChevronUp"]);
var ChevronDown = __mk(__P["ChevronDown"]);
var Sun = __mk(__P["Sun"]);
var Moon = __mk(__P["Moon"]);
var Pencil = __mk(__P["Pencil"]);
var ArrowRight = __mk(__P["ArrowRight"]);
var CircleCheck = __mk(__P["CircleCheck"]);
var Clock = __mk(__P["Clock"]);
var Percent = __mk(__P["Percent"]);
var Boxes = __mk(__P["Boxes"]);
var Settings = __mk(__P["Settings"]);
var ShieldCheck = __mk(__P["ShieldCheck"]);
var Link2 = __mk(__P["Link2"]);
var FileCode = __mk(__P["FileCode"]);
var CloudUpload = __mk(__P["CloudUpload"]);
var ImagePlus = __mk(__P["ImagePlus"]);
var CircleAlert = __mk(__P["CircleAlert"]);
var ExternalLink = __mk(__P["ExternalLink"]);
var FileDown = __mk(__P["FileDown"]);
var Sheet = __mk(__P["Sheet"]);
var Mail = __mk(__P["Mail"]);
var MessageCircle = __mk(__P["MessageCircle"]);
var Send = __mk(__P["Send"]);
var BookPlus = __mk(__P["BookPlus"]);
var Copy = __mk(__P["Copy"]);
var Zap = __mk(__P["Zap"]);
var ListChecks = __mk('<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>');
var Rocket = __mk('<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>');
var Sparkles = __mk('<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>');
var FileSpreadsheet = __mk('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/>');
var Bell = __mk(__P["Bell"]);
var Menu = __mk(__P["Menu"]);
function _crc32(buf) {
  var c,
    t = _crc32.t;
  if (!t) {
    t = _crc32.t = [];
    for (var n = 0; n < 256; n++) {
      c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ c >>> 1 : c >>> 1;
      t[n] = c >>> 0;
    }
  }
  var crc = 0 ^ -1;
  for (var i = 0; i < buf.length; i++) crc = crc >>> 8 ^ t[(crc ^ buf[i]) & 0xFF];
  return (crc ^ -1) >>> 0;
}
function _zip(files) {
  var enc = new TextEncoder(),
    parts = [],
    cd = [],
    off = 0;
  function u32(v) {
    return [v & 255, v >> 8 & 255, v >> 16 & 255, v >> 24 & 255];
  }
  function u16(v) {
    return [v & 255, v >> 8 & 255];
  }
  files.forEach(function (f) {
    var data = enc.encode(f.body),
      name = enc.encode(f.name),
      crc = _crc32(data);
    var lh = [].concat([80, 75, 3, 4], u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
    parts.push(new Uint8Array(lh), name, data);
    cd.push({
      name: name,
      crc: crc,
      len: data.length,
      off: off
    });
    off += lh.length + name.length + data.length;
  });
  var cdStart = off,
    cdParts = [];
  cd.forEach(function (e) {
    var h = [].concat([80, 75, 1, 2], u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(e.crc), u32(e.len), u32(e.len), u16(e.name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(e.off));
    cdParts.push(new Uint8Array(h), e.name);
    off += h.length + e.name.length;
  });
  var eocd = new Uint8Array([].concat([80, 75, 5, 6], u16(0), u16(0), u16(cd.length), u16(cd.length), u32(off - cdStart), u32(cdStart), u16(0)));
  var all = parts.concat(cdParts, [eocd]),
    total = all.reduce(function (s, a) {
      return s + a.length;
    }, 0);
  var out = new Uint8Array(total),
    p = 0;
  all.forEach(function (a) {
    out.set(a, p);
    p += a.length;
  });
  return out;
}
function _col(n) {
  var s = "";
  n++;
  while (n > 0) {
    var m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = (n - m - 1) / 26;
  }
  return s;
}
function _esc(v) {
  return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
/* Only formatted money becomes a number — account codes and quantities stay text. */
function _isNum(v) {
  if (typeof v === "number") return true;
  return typeof v === "string" && /^\(?-?[\d,]*\d\.\d{1,2}\)?$/.test(v.trim());
}
function _numVal(v) {
  if (typeof v === "number") return v;
  var s = String(v).trim(),
    neg = /^\(.*\)$/.test(s);
  s = s.replace(/[(),]/g, "");
  return (neg ? -1 : 1) * parseFloat(s);
}

/* sheets: [{name, rows: [[cell,...],...], bold:[rowIdx...]}] */
function buildXlsx(sheets) {
  var files = [];
  files.push({
    name: "[Content_Types].xml",
    body: '<?xml version="1.0" encoding="UTF-8"?>' + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' + '<Default Extension="xml" ContentType="application/xml"/>' + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map(function (s, i) {
      return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    }).join("") + '</Types>'
  });
  files.push({
    name: "_rels/.rels",
    body: '<?xml version="1.0" encoding="UTF-8"?>' + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
  });
  files.push({
    name: "xl/workbook.xml",
    body: '<?xml version="1.0" encoding="UTF-8"?>' + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheets.map(function (s, i) {
      return '<sheet name="' + _esc(s.name.slice(0, 31)) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
    }).join("") + '</sheets></workbook>'
  });
  files.push({
    name: "xl/_rels/workbook.xml.rels",
    body: '<?xml version="1.0" encoding="UTF-8"?>' + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map(function (s, i) {
      return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
    }).join("") + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
  });
  files.push({
    name: "xl/styles.xml",
    body: '<?xml version="1.0" encoding="UTF-8"?>' + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' + '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>' + '<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font>' + '<font><b/><sz val="11"/><name val="Calibri"/></font>' + '<font><b/><sz val="14"/><name val="Calibri"/></font></fonts>' + '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' + '<fill><patternFill patternType="solid"><fgColor rgb="FFEFF4F6"/><bgColor indexed="64"/></patternFill></fill></fills>' + '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' + '<border><left/><right/><top/><bottom style="thin"><color rgb="FF9BAFB9"/></bottom><diagonal/></border></borders>' + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' + '<cellXfs count="5">' + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' + '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' + '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' + '<xf numFmtId="164" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>' + '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' + '</cellXfs></styleSheet>'
  });
  sheets.forEach(function (sh, si) {
    var widths = [];
    sh.rows.forEach(function (r) {
      r.forEach(function (c, i) {
        widths[i] = Math.max(widths[i] || 9, Math.min(46, String(c == null ? "" : c).length + 2));
      });
    });
    var body = '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' + '<cols>' + widths.map(function (w, i) {
      return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>';
    }).join("") + '</cols><sheetData>';
    sh.rows.forEach(function (r, ri) {
      body += '<row r="' + (ri + 1) + '">';
      r.forEach(function (c, ci) {
        if (c == null || c === "") return;
        var ref = _col(ci) + (ri + 1),
          head = (sh.head || []).indexOf(ri) >= 0,
          bold = (sh.bold || []).indexOf(ri) >= 0;
        if (_isNum(c) && !head) {
          body += '<c r="' + ref + '" s="' + (bold ? 3 : 2) + '"><v>' + _numVal(c) + '</v></c>';
        } else {
          body += '<c r="' + ref + '" t="inlineStr" s="' + (head ? 1 : bold ? 1 : ri === 0 && si === 0 ? 4 : 0) + '"><is><t xml:space="preserve">' + _esc(c) + '</t></is></c>';
        }
      });
      body += '</row>';
    });
    body += '</sheetData></worksheet>';
    files.push({
      name: "xl/worksheets/sheet" + (si + 1) + ".xml",
      body: body
    });
  });
  return _zip(files);
}

